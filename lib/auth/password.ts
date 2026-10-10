import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

// scrypt with N=2^15 (about 32 MB and ~50–100 ms per hash): slow enough to
// make offline guessing expensive, fast enough for a sign-in request.
const params = { N: 32768, r: 8, p: 1 };
const keyLength = 32;

/** Stored as "scrypt$N$r$p$salt$hash" so parameters can be raised later. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, keyLength, { ...params, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", params.N, params.r, params.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * Hashing a throwaway value when there is no account keeps "no such
 * account" and "wrong password" equally slow, so timing doesn't reveal
 * which addresses are registered.
 */
let decoy: Promise<string> | undefined;
export async function burnPasswordCheck(password: string) {
  decoy ??= hashPassword("decoy-password-for-timing");
  await verifyPassword(password, await decoy);
}

const common = new Set([
  "password123", "1234567890", "qwertyuiop", "password1234", "iloveyou12", "letmein123",
  "welcome123", "admin12345", "abcdefghij", "0123456789", "passw0rd123", "medicalxr1",
]);

/** A reason the password is unacceptable, or null. Length beats complexity rules. */
export function passwordProblem(password: string, email: string) {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "Use at most 200 characters.";
  if (common.has(password.toLowerCase())) return "That password is too common.";
  if (password.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) {
    return "Don't include your email name in the password.";
  }
  if (new Set(password).size < 4) return "Use more varied characters.";
  return null;
}
