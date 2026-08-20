import { sha256Hex } from "./hash";
import { normalizeErrorShape } from "./normalize";
import { Outcome } from "./types";

const FINGERPRINT_LENGTH = 16;
const ARGS_HASH_LENGTH = 12;

/**
 * Fingerprint = sha256(toolName + outcome + normalized error shape), truncated.
 * `rawPayload` is normalized (UUIDs/timestamps/numbers stripped) before hashing
 * so payloads differing only in those volatile values collapse to one fingerprint.
 */
export function computeFingerprint(
  toolName: string,
  outcome: Outcome,
  rawPayload: string
): string {
  const normalized = normalizeErrorShape(rawPayload);
  const material = `${toolName}|${outcome}|${normalized}`;
  return sha256Hex(material).slice(0, FINGERPRINT_LENGTH);
}

/** Hash of a call's arguments, used to detect repeated identical calls (thrash). */
export function computeArgsHash(args: unknown): string {
  const canonical = canonicalize(args);
  return sha256Hex(canonical).slice(0, ARGS_HASH_LENGTH);
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
