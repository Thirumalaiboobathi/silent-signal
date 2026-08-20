import { client } from "./data-client";
import { classify } from "./classify";
import { computeArgsHash, computeFingerprint } from "./fingerprint";
import { Outcome, ToolCall } from "./types";

interface ToolCallRow {
  id: string;
  toolName: string;
  timestamp: string;
  rawPayload: string;
  // The generated a.enum() field type is nullable even though we always
  // write a value; every row created by ingestToolCall() has one set.
  outcome: Outcome | null;
  fingerprint: string;
  argsHash: string;
  summary?: string | null;
  sessionId: string;
}

function toToolCall(row: ToolCallRow): ToolCall {
  if (!row.outcome) {
    throw new Error(`ToolCall ${row.id} is missing its outcome`);
  }
  return {
    id: row.id,
    toolName: row.toolName,
    timestamp: row.timestamp,
    rawPayload: row.rawPayload,
    outcome: row.outcome,
    fingerprint: row.fingerprint,
    argsHash: row.argsHash,
    summary: row.summary ?? null,
    sessionId: row.sessionId,
  };
}

export async function listToolCalls(): Promise<ToolCall[]> {
  const { data, errors } = await client.models.ToolCall.list();
  if (errors) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data
    .map(toToolCall)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

async function priorTopLevelKeySets(toolName: string): Promise<string[][]> {
  const { data } = await client.models.ToolCall.list({
    filter: { toolName: { eq: toolName } },
  });
  const sets: string[][] = [];
  for (const row of data) {
    try {
      const parsed = JSON.parse(row.rawPayload);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        sets.push(Object.keys(parsed).sort());
      }
    } catch {
      // Payloads that don't parse can't contribute a shape.
    }
  }
  return sets;
}

export interface IngestInput {
  toolName: string;
  rawPayload: string;
  sessionId: string;
}

export interface IngestResult {
  call: ToolCall;
  reason: string;
}

export async function ingestToolCall(
  input: IngestInput
): Promise<IngestResult> {
  const priorShapes = await priorTopLevelKeySets(input.toolName);
  const result = classify(input.rawPayload, input.toolName, priorShapes);
  const fingerprint = computeFingerprint(
    input.toolName,
    result.outcome,
    input.rawPayload
  );
  // The verify form only collects a response payload, not the call's actual
  // arguments, so the payload itself stands in as the dedupe key: identical
  // repeated pastes hash the same way real repeated args would.
  const argsHash = computeArgsHash(input.rawPayload);

  const { data, errors } = await client.models.ToolCall.create({
    toolName: input.toolName,
    timestamp: new Date().toISOString(),
    rawPayload: input.rawPayload,
    outcome: result.outcome,
    fingerprint,
    argsHash,
    sessionId: input.sessionId,
  });

  if (errors || !data) {
    throw new Error(
      errors?.map((e) => e.message).join("; ") ?? "Failed to create ToolCall"
    );
  }

  return { call: toToolCall(data), reason: result.reason };
}
