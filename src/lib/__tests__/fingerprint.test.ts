import { describe, expect, it } from "vitest";
import { computeArgsHash, computeFingerprint } from "../fingerprint";

describe("computeFingerprint", () => {
  it("produces a 16-character lowercase hex string", () => {
    const fp = computeFingerprint(
      "send_email",
      "TOOL_ERROR",
      `{"content":[{"type":"text","text":"SMTP timeout"}],"isError":true}`
    );
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic for identical inputs", () => {
    const payload = `{"content":[],"requestId":"abc-123"}`;
    const a = computeFingerprint("get_weather", "EMPTY_RESULT", payload);
    const b = computeFingerprint("get_weather", "EMPTY_RESULT", payload);
    expect(a).toBe(b);
  });

  it("groups payloads that differ only by UUID under one fingerprint", () => {
    const a = computeFingerprint(
      "send_email",
      "TOOL_ERROR",
      `{"content":[{"type":"text","text":"failed"}],"isError":true,"requestId":"3fa85f64-5717-4562-b3fc-2c963f66afa6"}`
    );
    const b = computeFingerprint(
      "send_email",
      "TOOL_ERROR",
      `{"content":[{"type":"text","text":"failed"}],"isError":true,"requestId":"9c858901-8a57-4791-81fe-4c455b099bc9"}`
    );
    expect(a).toBe(b);
  });

  it("groups payloads that differ only by timestamp under one fingerprint", () => {
    const a = computeFingerprint(
      "book_hotel",
      "TOOL_ERROR",
      `{"content":[{"type":"text","text":"no rooms"}],"isError":true,"at":"2026-08-20T09:13:41.000Z"}`
    );
    const b = computeFingerprint(
      "book_hotel",
      "TOOL_ERROR",
      `{"content":[{"type":"text","text":"no rooms"}],"isError":true,"at":"2026-08-21T14:02:09.512Z"}`
    );
    expect(a).toBe(b);
  });

  it("groups payloads that differ only by a numeric value under one fingerprint", () => {
    const a = computeFingerprint(
      "book_hotel",
      "TOOL_ERROR",
      `{"content":[{"type":"text","text":"only 2 rooms left, need 5"}],"isError":true}`
    );
    const b = computeFingerprint(
      "book_hotel",
      "TOOL_ERROR",
      `{"content":[{"type":"text","text":"only 9 rooms left, need 12"}],"isError":true}`
    );
    expect(a).toBe(b);
  });

  it("produces different fingerprints for different tool names", () => {
    const payload = `{"content":[],"isError":true}`;
    const a = computeFingerprint("book_hotel", "TOOL_ERROR", payload);
    const b = computeFingerprint("send_email", "TOOL_ERROR", payload);
    expect(a).not.toBe(b);
  });

  it("produces different fingerprints for different outcomes on the same payload shape", () => {
    const a = computeFingerprint("get_weather", "EMPTY_RESULT", `{"content":[]}`);
    const b = computeFingerprint("get_weather", "SUCCESS", `{"content":[]}`);
    expect(a).not.toBe(b);
  });

  it("produces different fingerprints for genuinely different error text", () => {
    const a = computeFingerprint(
      "send_email",
      "TOOL_ERROR",
      `{"isError":true,"content":[{"type":"text","text":"SMTP timeout"}]}`
    );
    const b = computeFingerprint(
      "send_email",
      "TOOL_ERROR",
      `{"isError":true,"content":[{"type":"text","text":"auth rejected"}]}`
    );
    expect(a).not.toBe(b);
  });
});

describe("computeArgsHash", () => {
  it("is deterministic for identical args", () => {
    const args = { to: "a@example.com", subject: "hi" };
    expect(computeArgsHash(args)).toBe(computeArgsHash({ ...args }));
  });

  it("is order-independent for object keys", () => {
    const a = computeArgsHash({ to: "a@example.com", subject: "hi" });
    const b = computeArgsHash({ subject: "hi", to: "a@example.com" });
    expect(a).toBe(b);
  });

  it("differs for different args", () => {
    const a = computeArgsHash({ to: "a@example.com" });
    const b = computeArgsHash({ to: "b@example.com" });
    expect(a).not.toBe(b);
  });
});
