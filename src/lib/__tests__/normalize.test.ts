import { describe, expect, it } from "vitest";
import { normalizeErrorShape } from "../normalize";

describe("normalizeErrorShape", () => {
  it("replaces UUIDs with a placeholder", () => {
    const out = normalizeErrorShape(
      "request 3fa85f64-5717-4562-b3fc-2c963f66afa6 failed"
    );
    expect(out).toBe("request <uuid> failed");
  });

  it("replaces ISO timestamps with a placeholder", () => {
    const out = normalizeErrorShape("failed at 2026-08-20T09:13:41.000Z");
    expect(out).toBe("failed at <timestamp>");
  });

  it("replaces bare numbers with a placeholder", () => {
    const out = normalizeErrorShape("retry 3 of 5 attempts, waited 120.5s");
    expect(out).toBe("retry <num> of <num> attempts, waited <num>s");
  });

  it("strips timestamps and UUIDs before the generic number pass so digits aren't double-mangled", () => {
    const out = normalizeErrorShape(
      "id=3fa85f64-5717-4562-b3fc-2c963f66afa6 at=2026-08-20T09:13:41.000Z code=42"
    );
    expect(out).toBe("id=<uuid> at=<timestamp> code=<num>");
  });

  it("leaves text with no volatile values untouched", () => {
    const out = normalizeErrorShape("auth token rejected");
    expect(out).toBe("auth token rejected");
  });
});
