import { and, eq, gt, isNull } from "drizzle-orm";
import { getDatabase } from "../client";
import { verificationTokens } from "../schema";
import { generateToken, hashToken } from "../../auth/tokens";

const tokenLifetimeMs = 15 * 60 * 1000; // 15 minutes — a magic link is a live secret

export async function createVerificationToken(email: string) {
  const raw = generateToken();
  const expiresAt = new Date(Date.now() + tokenLifetimeMs);

  await getDatabase()
    .insert(verificationTokens)
    .values({ email: email.toLowerCase().trim(), tokenHash: hashToken(raw), expiresAt });

  return { raw, expiresAt };
}

/**
 * Which address a link was sent to, without using it up — the confirm page
 * shows it so a person can see whose account they are about to enter.
 */
export async function peekVerificationToken(rawToken: string) {
  const [row] = await getDatabase()
    .select({ email: verificationTokens.email })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, hashToken(rawToken)),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.consumedAt),
      ),
    )
    .limit(1);
  return row?.email;
}

/**
 * Consumes the token: a magic link works exactly once. One conditional
 * UPDATE, so two simultaneous requests can't both win.
 */
export async function consumeVerificationToken(rawToken: string) {
  const [row] = await getDatabase()
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.tokenHash, hashToken(rawToken)),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.consumedAt),
      ),
    )
    .returning({ email: verificationTokens.email });
  return row?.email;
}
