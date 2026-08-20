import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { Outcome } from "./types";

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "apac.amazon.nova-pro-v1:0";
const REGION =
  process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? "ap-south-1";

const TEMPLATE_PREFIXES: Record<Outcome, string> = {
  SUCCESS: "completed successfully",
  TOOL_ERROR: "failed",
  EMPTY_RESULT: "returned HTTP 200 with an empty result",
  MALFORMED: "returned a malformed response",
  SCHEMA_DRIFT: "returned a response shape that changed unexpectedly",
};

/** Deterministic, no-AWS-dependency summary. Always available. */
export function templateSummary(
  toolName: string,
  outcome: Outcome,
  reason: string
): string {
  return `${toolName} ${TEMPLATE_PREFIXES[outcome]} — ${reason}`;
}

function isBedrockEnabled(): boolean {
  return process.env.USE_BEDROCK === "true";
}

let cachedClient: BedrockRuntimeClient | null = null;
function getClient(): BedrockRuntimeClient {
  if (!cachedClient) {
    cachedClient = new BedrockRuntimeClient({ region: REGION });
  }
  return cachedClient;
}

async function bedrockSummary(
  toolName: string,
  outcome: Outcome,
  reason: string,
  rawPayload: string
): Promise<string> {
  const prompt = `A tool named "${toolName}" was called and returned HTTP 200, but automated analysis classified the result as ${outcome}.
Technical reason: ${reason}
Raw response (truncated): ${rawPayload.slice(0, 500)}

Write one short, plain-English sentence (max 25 words) explaining what went wrong for someone monitoring this tool. No preamble, just the sentence.`;

  const response = await getClient().send(
    new ConverseCommand({
      modelId: MODEL_ID,
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 80, temperature: 0.3 },
    })
  );

  const text = response.output?.message?.content?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Bedrock returned an empty response");
  }
  return text;
}

/**
 * Generates a human-readable summary for a classified tool call. Bedrock is
 * only attempted when USE_BEDROCK=true; any failure (disabled, no access,
 * network error, empty response) falls back to the deterministic template
 * so this can never break the page that called it.
 */
export async function generateSummary(
  toolName: string,
  outcome: Outcome,
  reason: string,
  rawPayload: string
): Promise<string> {
  if (!isBedrockEnabled()) {
    return templateSummary(toolName, outcome, reason);
  }
  try {
    return await bedrockSummary(toolName, outcome, reason, rawPayload);
  } catch (err) {
    console.error(
      "Bedrock summary generation failed, falling back to template:",
      err
    );
    return templateSummary(toolName, outcome, reason);
  }
}
