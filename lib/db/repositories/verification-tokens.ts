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

/** Consumes the token: a magic link works exactly once. */
export async function consumeVerificationToken(rawToken: string) {
  const database = getDatabase();
  const tokenHash = hashToken(rawToken);

  const [row] = await database
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.consumedAt),
      ),
    )
    .limit(1);

  if (!row) return undefined;

  await database
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, row.id));

  return row.email;
}
