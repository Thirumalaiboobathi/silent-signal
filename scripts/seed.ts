/**
 * Seeds ~30 realistic ToolCall records into the deployed Amplify backend so
 * the demo isn't empty. Reuses the same classify/fingerprint/argsHash
 * functions the app uses at request time, so seeded data is classified
 * exactly the way live traffic would be — including two thrash bursts and a
 * schema-drift progression on get_account_balance.
 *
 * Run with: npm run seed
 */
import { classify } from "../src/lib/classify";
import { client } from "../src/lib/data-client";
import { computeArgsHash, computeFingerprint } from "../src/lib/fingerprint";
import { detectThrash } from "../src/lib/thrash";
import { Outcome } from "../src/lib/types";

interface Scenario {
  toolName: string;
  rawPayload: string;
  sessionId: string;
  /** Seconds before "now" this call happened. Listed oldest (largest) first. */
  offsetSeconds: number;
}

const SCENARIOS: Scenario[] = [
  // search_flights — clean, reliable tool
  {
    toolName: "search_flights",
    rawPayload: `{"content":[{"type":"text","text":"Found 4 flights from BOM to SFO"}]}`,
    sessionId: "sess_alpha",
    offsetSeconds: 10800,
  },
  {
    toolName: "search_flights",
    rawPayload: `{"content":[{"type":"text","text":"Found 6 flights from JFK to LAX"}]}`,
    sessionId: "sess_bravo",
    offsetSeconds: 10500,
  },
  // book_hotel — one isolated failure early on
  {
    toolName: "book_hotel",
    rawPayload: `{"content":[{"type":"text","text":"Error: no rooms available"}],"isError":true}`,
    sessionId: "sess_alpha",
    offsetSeconds: 10200,
  },
  // get_weather — both empty-result flavors
  {
    toolName: "get_weather",
    rawPayload: `{"content":[]}`,
    sessionId: "sess_alpha",
    offsetSeconds: 9900,
  },
  {
    toolName: "get_weather",
    rawPayload: `{"content":[{"type":"text","text":"   "}]}`,
    sessionId: "sess_charlie",
    offsetSeconds: 9600,
  },
  // fetch_invoice — unparseable JSON
  {
    toolName: "fetch_invoice",
    rawPayload: `{"result": "invoice #4471 total $1,204.00`,
    sessionId: "sess_bravo",
    offsetSeconds: 9300,
  },
  // list_contacts — valid JSON, missing content field entirely
  {
    toolName: "list_contacts",
    rawPayload: `{"items":["a@example.com","b@example.com"]}`,
    sessionId: "sess_charlie",
    offsetSeconds: 9000,
  },
  // get_account_balance — schema-drift storyline: shape A, shape A, then two
  // different drifted shapes later in the timeline
  {
    toolName: "get_account_balance",
    rawPayload: `{"content":[{"type":"text","text":"Balance: $482.10"}]}`,
    sessionId: "sess_delta",
    offsetSeconds: 8700,
  },
  {
    toolName: "get_account_balance",
    rawPayload: `{"content":[{"type":"text","text":"Balance: $1,204.55"}]}`,
    sessionId: "sess_echo",
    offsetSeconds: 8400,
  },
  {
    toolName: "get_account_balance",
    rawPayload: `{"content":[{"type":"text","text":"Balance: $200.00"}],"meta":{"currency":"USD"}}`,
    sessionId: "sess_delta",
    offsetSeconds: 8100,
  },
  // translate_text — success then empty
  {
    toolName: "translate_text",
    rawPayload: `{"content":[{"type":"text","text":"Bonjour -> Hello"}]}`,
    sessionId: "sess_bravo",
    offsetSeconds: 7800,
  },
  {
    toolName: "translate_text",
    rawPayload: `{"content":[{"type":"text","text":""}]}`,
    sessionId: "sess_bravo",
    offsetSeconds: 7500,
  },
  // create_calendar_event — success then error
  {
    toolName: "create_calendar_event",
    rawPayload: `{"content":[{"type":"text","text":"Event 'Team Sync' created for 3:00 PM"}]}`,
    sessionId: "sess_echo",
    offsetSeconds: 7200,
  },
  {
    toolName: "create_calendar_event",
    rawPayload: `{"content":[{"type":"text","text":"Error: conflict, overlapping event at that time"}],"isError":true}`,
    sessionId: "sess_echo",
    offsetSeconds: 6900,
  },
  // search_web — two clean successes
  {
    toolName: "search_web",
    rawPayload: `{"content":[{"type":"text","text":"5 results found for 'aws amplify gen2'"}]}`,
    sessionId: "sess_foxtrot",
    offsetSeconds: 6600,
  },
  {
    toolName: "search_web",
    rawPayload: `{"content":[{"type":"text","text":"3 results found for 'dynamodb pricing'"}]}`,
    sessionId: "sess_foxtrot",
    offsetSeconds: 6300,
  },
  // get_stock_price — success then malformed
  {
    toolName: "get_stock_price",
    rawPayload: `{"content":[{"type":"text","text":"AAPL: $232.10, +1.2% today"}]}`,
    sessionId: "sess_golf",
    offsetSeconds: 6000,
  },
  {
    toolName: "get_stock_price",
    rawPayload: `{"content": [{"type": "text", "text": "AAPL: $232`,
    sessionId: "sess_golf",
    offsetSeconds: 5700,
  },
  // upload_document — success then empty
  {
    toolName: "upload_document",
    rawPayload: `{"content":[{"type":"text","text":"Uploaded quarterly_report.pdf (2.4MB)"}]}`,
    sessionId: "sess_hotel",
    offsetSeconds: 5400,
  },
  {
    toolName: "upload_document",
    rawPayload: `{"content":[]}`,
    sessionId: "sess_hotel",
    offsetSeconds: 5100,
  },
  // send_email — thrash burst #1: 3 identical failures within 20s
  {
    toolName: "send_email",
    rawPayload: `{"content":[{"type":"text","text":"Error: SMTP timeout after 30s"}],"isError":true}`,
    sessionId: "sess_gamma",
    offsetSeconds: 900,
  },
  {
    toolName: "send_email",
    rawPayload: `{"content":[{"type":"text","text":"Error: SMTP timeout after 30s"}],"isError":true}`,
    sessionId: "sess_gamma",
    offsetSeconds: 891,
  },
  {
    toolName: "send_email",
    rawPayload: `{"content":[{"type":"text","text":"Error: SMTP timeout after 30s"}],"isError":true}`,
    sessionId: "sess_gamma",
    offsetSeconds: 880,
  },
  // book_hotel — thrash burst #2: 4 identical failures within 40s, different
  // session so it's a distinct window from the isolated failure above
  {
    toolName: "book_hotel",
    rawPayload: `{"content":[{"type":"text","text":"Error: no rooms available"}],"isError":true}`,
    sessionId: "sess_india",
    offsetSeconds: 600,
  },
  {
    toolName: "book_hotel",
    rawPayload: `{"content":[{"type":"text","text":"Error: no rooms available"}],"isError":true}`,
    sessionId: "sess_india",
    offsetSeconds: 588,
  },
  {
    toolName: "book_hotel",
    rawPayload: `{"content":[{"type":"text","text":"Error: no rooms available"}],"isError":true}`,
    sessionId: "sess_india",
    offsetSeconds: 575,
  },
  {
    toolName: "book_hotel",
    rawPayload: `{"content":[{"type":"text","text":"Error: no rooms available"}],"isError":true}`,
    sessionId: "sess_india",
    offsetSeconds: 561,
  },
  // get_account_balance — a third, different drifted shape, later in time
  {
    toolName: "get_account_balance",
    rawPayload: `{"content":[{"type":"text","text":"Balance: $75.20"}],"warning":"low balance"}`,
    sessionId: "sess_juliet",
    offsetSeconds: 300,
  },
  // wrap up with two recent, healthy calls
  {
    toolName: "search_flights",
    rawPayload: `{"content":[{"type":"text","text":"Found 2 flights from BOM to SFO"}]}`,
    sessionId: "sess_kilo",
    offsetSeconds: 60,
  },
  {
    toolName: "get_weather",
    rawPayload: `{"content":[{"type":"text","text":"22°C, clear skies, wind 8km/h"}]}`,
    sessionId: "sess_kilo",
    offsetSeconds: 20,
  },
];

async function clearExisting(): Promise<void> {
  const { data, errors } = await client.models.ToolCall.list();
  if (errors) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (data.length === 0) return;
  console.log(`Clearing ${data.length} existing ToolCall record(s)...`);
  await Promise.all(data.map((row) => client.models.ToolCall.delete({ id: row.id })));
}

async function seed(): Promise<void> {
  await clearExisting();

  const now = Date.now();
  const priorShapes = new Map<string, string[][]>();
  const inserted: {
    id: string;
    toolName: string;
    argsHash: string;
    sessionId: string;
    timestamp: string;
    outcome: Outcome;
  }[] = [];

  console.log(`\nSeeding ${SCENARIOS.length} tool calls...`);
  for (const scenario of SCENARIOS) {
    const prior = priorShapes.get(scenario.toolName) ?? [];
    const result = classify(scenario.rawPayload, scenario.toolName, prior);
    const fingerprint = computeFingerprint(
      scenario.toolName,
      result.outcome,
      scenario.rawPayload
    );
    const argsHash = computeArgsHash(scenario.rawPayload);
    const timestamp = new Date(now - scenario.offsetSeconds * 1000).toISOString();

    const { data, errors } = await client.models.ToolCall.create({
      toolName: scenario.toolName,
      timestamp,
      rawPayload: scenario.rawPayload,
      outcome: result.outcome,
      fingerprint,
      argsHash,
      sessionId: scenario.sessionId,
    });

    if (errors || !data) {
      throw new Error(
        `Failed to seed ${scenario.toolName}: ${errors?.map((e) => e.message).join("; ")}`
      );
    }

    if (result.topLevelKeys) {
      priorShapes.set(scenario.toolName, [...prior, result.topLevelKeys]);
    }

    inserted.push({
      id: data.id,
      toolName: scenario.toolName,
      argsHash,
      sessionId: scenario.sessionId,
      timestamp,
      outcome: result.outcome,
    });
    console.log(`  ${result.outcome.padEnd(13)} ${scenario.toolName} (${scenario.sessionId})`);
  }

  const counts = new Map<string, number>();
  for (const row of inserted) {
    counts.set(row.outcome, (counts.get(row.outcome) ?? 0) + 1);
  }
  console.log(`\nSeeded ${inserted.length} calls:`);
  for (const [outcome, count] of counts) {
    console.log(`  ${outcome}: ${count}`);
  }

  const windows = detectThrash(inserted);
  console.log(`\nDetected ${windows.length} thrash window(s):`);
  for (const w of windows) {
    console.log(`  ${w.toolName} x${w.count} on ${w.sessionId}`);
  }
}

seed()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nSeed failed:", err);
    process.exit(1);
  });
