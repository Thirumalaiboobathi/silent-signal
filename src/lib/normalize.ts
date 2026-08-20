const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const TIMESTAMP_RE =
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?/g;

const NUMBER_RE = /\d+(\.\d+)?/g;

/**
 * Strips UUIDs, timestamps, and numbers from a string, replacing each with a
 * stable placeholder so payloads differing only in those volatile values
 * normalize to the same shape. Order matters: UUIDs and timestamps contain
 * digits, so they must be stripped before the generic number pass.
 */
export function normalizeErrorShape(text: string): string {
  return text
    .replace(UUID_RE, "<uuid>")
    .replace(TIMESTAMP_RE, "<timestamp>")
    .replace(NUMBER_RE, "<num>");
}
