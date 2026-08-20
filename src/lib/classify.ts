import { Outcome } from "./types";

export interface ClassifyResult {
  outcome: Outcome;
  reason: string;
  /** Sorted top-level keys of the parsed payload, or null if it couldn't be parsed as an object. */
  topLevelKeys: string[] | null;
}

interface TextBlock {
  type: "text";
  text: string;
}

function isTextBlock(item: unknown): item is TextBlock {
  return (
    typeof item === "object" &&
    item !== null &&
    (item as Record<string, unknown>).type === "text" &&
    typeof (item as Record<string, unknown>).text === "string"
  );
}

function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

/** Recursively searches for a key `isError` with value `true` anywhere in the tree. */
function containsIsErrorTrue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsIsErrorTrue);
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.isError === true) return true;
    return Object.values(obj).some(containsIsErrorTrue);
  }
  return false;
}

function sameKeySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((key, i) => key === b[i]);
}

/**
 * Deterministically classifies a raw tool-call response payload.
 *
 * `priorTopLevelKeySets` is the set of distinct top-level key shapes this
 * toolName has returned before (each entry pre-sorted); pass an empty array
 * for a toolName seen for the first time, in which case SCHEMA_DRIFT can
 * never fire.
 */
export function classify(
  rawPayload: string,
  toolName: string,
  priorTopLevelKeySets: string[][] = []
): ClassifyResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    return {
      outcome: "MALFORMED",
      reason: "JSON.parse failed on the raw payload.",
      topLevelKeys: null,
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      outcome: "MALFORMED",
      reason: "Parsed payload is not a JSON object.",
      topLevelKeys: null,
    };
  }

  const obj = parsed as Record<string, unknown>;
  const topLevelKeys = Object.keys(obj).sort();

  if (containsIsErrorTrue(obj)) {
    return {
      outcome: "TOOL_ERROR",
      reason: "Found isError: true somewhere in the result.",
      topLevelKeys,
    };
  }

  if (!("content" in obj)) {
    return {
      outcome: "MALFORMED",
      reason: "Response is missing the content field entirely.",
      topLevelKeys,
    };
  }

  const content = obj.content;
  if (!Array.isArray(content)) {
    return {
      outcome: "MALFORMED",
      reason: "content field is present but is not an array.",
      topLevelKeys,
    };
  }

  if (content.length === 0) {
    return {
      outcome: "EMPTY_RESULT",
      reason: "content array is empty.",
      topLevelKeys,
    };
  }

  const textBlocks = content.filter(isTextBlock);
  if (textBlocks.length > 0 && textBlocks.every((b) => isBlank(b.text))) {
    return {
      outcome: "EMPTY_RESULT",
      reason: "All text blocks in content are blank or whitespace.",
      topLevelKeys,
    };
  }

  const seenBefore = priorTopLevelKeySets.some((keys) =>
    sameKeySet(keys, topLevelKeys)
  );
  if (priorTopLevelKeySets.length > 0 && !seenBefore) {
    return {
      outcome: "SCHEMA_DRIFT",
      reason: `toolName "${toolName}" previously returned different top-level keys (seen: [${priorTopLevelKeySets
        .map((k) => k.join(","))
        .join("] | [")}], now: [${topLevelKeys.join(",")}]).`,
      topLevelKeys,
    };
  }

  return {
    outcome: "SUCCESS",
    reason: "No error signal, non-empty content, and shape matches prior calls.",
    topLevelKeys,
  };
}
