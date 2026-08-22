import { randomBytes, createHash } from "node:crypto";

/**
 * A token exists in two forms: the raw value, seen once by the recipient (in
 * a magic-link URL or a session cookie), and its SHA-256 hash, the only form
 * ever stored. A leaked database row is useless without the raw token; a
 * stolen cookie is useless without the row.
 */
export function generateToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
