import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  // Must be a real function (not an arrow fn) so `new BedrockRuntimeClient()`
  // is constructible; returning an object here overrides the `this` binding.
  BedrockRuntimeClient: vi.fn().mockImplementation(function () {
    return { send: sendMock };
  }),
  ConverseCommand: vi.fn().mockImplementation(function (input: unknown) {
    return input;
  }),
}));

const { generateSummary, templateSummary } = await import("../summary");

describe("templateSummary", () => {
  it("includes the tool name and the classifier's reason", () => {
    const result = templateSummary("send_email", "TOOL_ERROR", "SMTP timeout after 30s.");
    expect(result).toContain("send_email");
    expect(result).toContain("SMTP timeout after 30s.");
  });

  it("produces a distinct summary per outcome for the same tool", () => {
    const summaries = (
      ["SUCCESS", "TOOL_ERROR", "EMPTY_RESULT", "MALFORMED", "SCHEMA_DRIFT"] as const
    ).map((outcome) => templateSummary("get_weather", outcome, "reason"));
    expect(new Set(summaries).size).toBe(summaries.length);
  });
});

describe("generateSummary", () => {
  const originalEnv = process.env.USE_BEDROCK;

  beforeEach(() => {
    sendMock.mockReset();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.USE_BEDROCK;
    } else {
      process.env.USE_BEDROCK = originalEnv;
    }
  });

  it("uses the template summary and never calls Bedrock when USE_BEDROCK is unset", async () => {
    delete process.env.USE_BEDROCK;
    const result = await generateSummary(
      "get_weather",
      "EMPTY_RESULT",
      "content array is empty.",
      `{"content":[]}`
    );
    expect(result).toBe(
      templateSummary("get_weather", "EMPTY_RESULT", "content array is empty.")
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("uses the template summary when USE_BEDROCK=false", async () => {
    process.env.USE_BEDROCK = "false";
    await generateSummary("get_weather", "EMPTY_RESULT", "reason", `{"content":[]}`);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns the Bedrock-generated text when USE_BEDROCK=true and the call succeeds", async () => {
    process.env.USE_BEDROCK = "true";
    sendMock.mockResolvedValueOnce({
      output: {
        message: { content: [{ text: "The weather tool came back with nothing." }] },
      },
    });
    const result = await generateSummary(
      "get_weather",
      "EMPTY_RESULT",
      "content array is empty.",
      `{"content":[]}`
    );
    expect(result).toBe("The weather tool came back with nothing.");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the template summary when the Bedrock call throws", async () => {
    process.env.USE_BEDROCK = "true";
    sendMock.mockRejectedValueOnce(new Error("AccessDeniedException"));
    const result = await generateSummary(
      "get_weather",
      "EMPTY_RESULT",
      "content array is empty.",
      `{"content":[]}`
    );
    expect(result).toBe(
      templateSummary("get_weather", "EMPTY_RESULT", "content array is empty.")
    );
  });

  it("falls back to the template summary when Bedrock returns a blank response", async () => {
    process.env.USE_BEDROCK = "true";
    sendMock.mockResolvedValueOnce({
      output: { message: { content: [{ text: "   " }] } },
    });
    const result = await generateSummary(
      "send_email",
      "TOOL_ERROR",
      "SMTP timeout",
      `{"isError":true}`
    );
    expect(result).toBe(templateSummary("send_email", "TOOL_ERROR", "SMTP timeout"));
  });

  it("falls back to the template summary when Bedrock's response has no content at all", async () => {
    process.env.USE_BEDROCK = "true";
    sendMock.mockResolvedValueOnce({ output: {} });
    const result = await generateSummary(
      "book_hotel",
      "TOOL_ERROR",
      "no rooms available",
      `{"isError":true}`
    );
    expect(result).toBe(
      templateSummary("book_hotel", "TOOL_ERROR", "no rooms available")
    );
  });
});
