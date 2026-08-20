export type Outcome =
  | "SUCCESS"
  | "TOOL_ERROR"
  | "EMPTY_RESULT"
  | "MALFORMED"
  | "SCHEMA_DRIFT";

export interface ToolCall {
  id: string;
  toolName: string;
  timestamp: string;
  rawPayload: string;
  outcome: Outcome;
  fingerprint: string;
  argsHash: string;
  summary: string | null;
  sessionId: string;
}

export interface ThrashWindow {
  id: string;
  toolName: string;
  sessionId: string;
  argsHash: string;
  count: number;
  windowStart: string;
  windowEnd: string;
  callIds: string[];
}
