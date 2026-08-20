import { describe, expect, it } from "vitest";
import { detectThrash, ThrashInput } from "../thrash";

function call(
  id: string,
  offsetSeconds: number,
  overrides: Partial<ThrashInput> = {}
): ThrashInput {
  const base = Date.parse("2026-08-20T09:00:00.000Z");
  return {
    id,
    toolName: "send_email",
    argsHash: "h_2b90",
    sessionId: "sess_gamma",
    timestamp: new Date(base + offsetSeconds * 1000).toISOString(),
    ...overrides,
  };
}

describe("detectThrash", () => {
  it("flags 3 identical calls within 60 seconds as a thrash window", () => {
    const calls = [call("c1", 0), call("c2", 8), call("c3", 17)];
    const windows = detectThrash(calls);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      toolName: "send_email",
      sessionId: "sess_gamma",
      argsHash: "h_2b90",
      count: 3,
      callIds: ["c1", "c2", "c3"],
    });
  });

  it("does not flag only 2 repeated calls", () => {
    const calls = [call("c1", 0), call("c2", 8)];
    expect(detectThrash(calls)).toHaveLength(0);
  });

  it("does not flag 3 calls spread beyond the 60-second window", () => {
    const calls = [call("c1", 0), call("c2", 30), call("c3", 65)];
    expect(detectThrash(calls)).toHaveLength(0);
  });

  it("does not merge calls with different argsHash even if same tool/session", () => {
    const calls = [
      call("c1", 0, { argsHash: "h_aaa" }),
      call("c2", 8, { argsHash: "h_bbb" }),
      call("c3", 17, { argsHash: "h_ccc" }),
    ];
    expect(detectThrash(calls)).toHaveLength(0);
  });

  it("does not merge calls with different sessionId even if same tool/args", () => {
    const calls = [
      call("c1", 0, { sessionId: "sess_a" }),
      call("c2", 8, { sessionId: "sess_b" }),
      call("c3", 17, { sessionId: "sess_c" }),
    ];
    expect(detectThrash(calls)).toHaveLength(0);
  });

  it("does not merge calls for different tool names", () => {
    const calls = [
      call("c1", 0, { toolName: "send_email" }),
      call("c2", 8, { toolName: "book_hotel" }),
      call("c3", 17, { toolName: "get_weather" }),
    ];
    expect(detectThrash(calls)).toHaveLength(0);
  });

  it("reports one burst per non-overlapping cluster, not one per call", () => {
    const calls = [
      call("c1", 0),
      call("c2", 5),
      call("c3", 10),
      call("c4", 15),
      call("c5", 20),
    ];
    const windows = detectThrash(calls);
    expect(windows).toHaveLength(1);
    expect(windows[0].count).toBe(5);
    expect(windows[0].callIds).toEqual(["c1", "c2", "c3", "c4", "c5"]);
  });

  it("splits into two separate windows when a gap resets the burst", () => {
    const calls = [
      call("c1", 0),
      call("c2", 10),
      call("c3", 20),
      // gap > 60s from c1
      call("c4", 200),
      call("c5", 210),
      call("c6", 220),
    ];
    const windows = detectThrash(calls);
    expect(windows).toHaveLength(2);
    expect(windows[0].callIds).toEqual(["c1", "c2", "c3"]);
    expect(windows[1].callIds).toEqual(["c4", "c5", "c6"]);
  });

  it("respects custom windowMs and threshold parameters", () => {
    const calls = [call("c1", 0), call("c2", 3), call("c3", 6), call("c4", 9)];
    const windows = detectThrash(calls, 10_000, 4);
    expect(windows).toHaveLength(1);
    expect(windows[0].count).toBe(4);
  });
});
