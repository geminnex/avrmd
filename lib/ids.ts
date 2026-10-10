const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id is a 404, not a Postgres cast error surfacing as a 500. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}
