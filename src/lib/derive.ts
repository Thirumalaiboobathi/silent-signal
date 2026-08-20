import { Outcome, ToolCall } from "./types";

export function silentFailureCount(calls: ToolCall[]): number {
  return calls.filter((c) => c.outcome !== "SUCCESS").length;
}

export function fingerprintFrequency(
  calls: ToolCall[]
): { fingerprint: string; toolName: string; outcome: Outcome; count: number }[] {
  const map = new Map<string, { toolName: string; outcome: Outcome; count: number }>();
  for (const c of calls) {
    const existing = map.get(c.fingerprint);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(c.fingerprint, { toolName: c.toolName, outcome: c.outcome, count: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([fingerprint, v]) => ({ fingerprint, ...v }))
    .sort((a, b) => b.count - a.count);
}
