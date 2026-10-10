import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../client";
import { verificationTokens } from "../schema";
import { generateToken, hashToken } from "../../auth/tokens";

export type TokenPurpose = "sign_in" | "verify_email" | "reset_password";

/** A link is a live secret: as short as each job allows. */
const lifetimes: Record<TokenPurpose, number> = {
  sign_in: 15 * 60 * 1000,
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 30 * 60 * 1000,
};

export async function createVerificationToken(email: string, purpose: TokenPurpose) {
  const raw = generateToken();
  const expiresAt = new Date(Date.now() + lifetimes[purpose]);

  await getDatabase()
    .insert(verificationTokens)
    .values({ email: email.toLowerCase().trim(), tokenHash: hashToken(raw), expiresAt, purpose });

  return { raw, expiresAt };
}

/**
 * Which address a link was sent to, without using it up — the confirm page
 * shows it so a person can see whose account they are about to enter.
 */
export async function peekVerificationToken(rawToken: string) {
  const [row] = await getDatabase()
    .select({ email: verificationTokens.email, purpose: verificationTokens.purpose })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, hashToken(rawToken)),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.consumedAt),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Consumes the token: a magic link works exactly once. One conditional
 * UPDATE, so two simultaneous requests can't both win.
 */
export async function consumeVerificationToken(rawToken: string, purposes: TokenPurpose[]) {
  const [row] = await getDatabase()
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.tokenHash, hashToken(rawToken)),
        inArray(verificationTokens.purpose, purposes),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.consumedAt),
      ),
    )
    .returning({ email: verificationTokens.email, purpose: verificationTokens.purpose });
  return row;
}
