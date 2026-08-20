import { ThrashWindow } from "./types";

export interface ThrashInput {
  id: string;
  toolName: string;
  argsHash: string;
  sessionId: string;
  timestamp: string;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_THRESHOLD = 3;

/**
 * Finds maximal bursts of `threshold`+ calls sharing (sessionId, toolName,
 * argsHash) that land within `windowMs` of the burst's first call — an agent
 * stuck retrying the same call. Each burst is reported once; the scan
 * continues after the burst rather than sliding one call at a time, so
 * consecutive bursts don't overlap in the output.
 */
export function detectThrash(
  calls: ThrashInput[],
  windowMs: number = DEFAULT_WINDOW_MS,
  threshold: number = DEFAULT_THRESHOLD
): ThrashWindow[] {
  const groups = new Map<string, ThrashInput[]>();
  for (const call of calls) {
    const key = `${call.sessionId}::${call.toolName}::${call.argsHash}`;
    const group = groups.get(key);
    if (group) {
      group.push(call);
    } else {
      groups.set(key, [call]);
    }
  }

  const windows: ThrashWindow[] = [];
  let counter = 0;

  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    );

    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (
        j + 1 < sorted.length &&
        Date.parse(sorted[j + 1].timestamp) - Date.parse(sorted[i].timestamp) <=
          windowMs
      ) {
        j++;
      }

      const count = j - i + 1;
      if (count >= threshold) {
        const burst = sorted.slice(i, j + 1);
        const first = burst[0];
        windows.push({
          id: `thr_${counter++}`,
          toolName: first.toolName,
          sessionId: first.sessionId,
          argsHash: first.argsHash,
          count,
          windowStart: burst[0].timestamp,
          windowEnd: burst[burst.length - 1].timestamp,
          callIds: burst.map((c) => c.id),
        });
        i = j + 1;
      } else {
        i++;
      }
    }
  }

  return windows;
}
