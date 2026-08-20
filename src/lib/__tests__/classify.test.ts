import { describe, expect, it } from "vitest";
import { classify } from "../classify";

describe("classify", () => {
  it("returns SUCCESS for a well-formed, non-empty, error-free result", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"4 flights found"}]}`,
      "search_flights"
    );
    expect(result.outcome).toBe("SUCCESS");
    expect(result.topLevelKeys).toEqual(["content"]);
  });

  it("returns TOOL_ERROR when isError is true at the top level", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"boom"}],"isError":true}`,
      "book_hotel"
    );
    expect(result.outcome).toBe("TOOL_ERROR");
  });

  it("returns TOOL_ERROR when isError is true nested deep in the payload", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"ok"}],"meta":{"upstream":{"isError":true}}}`,
      "book_hotel"
    );
    expect(result.outcome).toBe("TOOL_ERROR");
  });

  it("does not flag isError: false as an error", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"ok"}],"isError":false}`,
      "book_hotel"
    );
    expect(result.outcome).toBe("SUCCESS");
  });

  it("returns EMPTY_RESULT when content is an empty array", () => {
    const result = classify(`{"content":[]}`, "get_weather");
    expect(result.outcome).toBe("EMPTY_RESULT");
  });

  it("returns EMPTY_RESULT when all text blocks are blank or whitespace", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"   "},{"type":"text","text":""}]}`,
      "get_weather"
    );
    expect(result.outcome).toBe("EMPTY_RESULT");
  });

  it("flags EMPTY_RESULT when the only text block is blank, even alongside a non-text block", () => {
    // Spec: "all text blocks blank/whitespace" — literally true here since
    // there's exactly one text block and it's blank.
    const result = classify(
      `{"content":[{"type":"text","text":"   "},{"type":"image","data":"..."}]}`,
      "get_weather"
    );
    expect(result.outcome).toBe("EMPTY_RESULT");
  });

  it("does not flag EMPTY_RESULT when content has no text blocks at all", () => {
    const result = classify(
      `{"content":[{"type":"image","data":"..."}]}`,
      "get_weather"
    );
    expect(result.outcome).toBe("SUCCESS");
  });

  it("returns MALFORMED when JSON.parse fails", () => {
    const result = classify(`{"result": "not valid json`, "fetch_invoice");
    expect(result.outcome).toBe("MALFORMED");
    expect(result.topLevelKeys).toBeNull();
  });

  it("returns MALFORMED when the content field is missing entirely", () => {
    const result = classify(`{"items":["a","b"]}`, "list_contacts");
    expect(result.outcome).toBe("MALFORMED");
  });

  it("returns MALFORMED when content is present but not an array", () => {
    const result = classify(`{"content":"oops"}`, "list_contacts");
    expect(result.outcome).toBe("MALFORMED");
  });

  it("returns SCHEMA_DRIFT when top-level keys differ from prior calls of the same tool", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"Balance: $482.10"}],"meta":{"currency":"USD"}}`,
      "get_account_balance",
      [["content"]]
    );
    expect(result.outcome).toBe("SCHEMA_DRIFT");
  });

  it("does not flag SCHEMA_DRIFT when the shape matches a previously seen shape", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"Balance: $1,204.55"}]}`,
      "get_account_balance",
      [["content"]]
    );
    expect(result.outcome).toBe("SUCCESS");
  });

  it("does not flag SCHEMA_DRIFT on the first-ever call for a tool", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"ok"}],"meta":{}}`,
      "brand_new_tool",
      []
    );
    expect(result.outcome).toBe("SUCCESS");
  });

  it("prioritizes TOOL_ERROR over SCHEMA_DRIFT when both conditions are present", () => {
    const result = classify(
      `{"content":[{"type":"text","text":"fail"}],"isError":true,"meta":{}}`,
      "get_account_balance",
      [["content"]]
    );
    expect(result.outcome).toBe("TOOL_ERROR");
  });
});
