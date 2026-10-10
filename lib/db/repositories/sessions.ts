import { and, eq, gt } from "drizzle-orm";
import { getDatabase } from "../client";
import { sessions, users } from "../schema";
import { generateToken, hashToken } from "../../auth/tokens";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string) {
  const raw = generateToken();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  await getDatabase().insert(sessions).values({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });

  return { raw, expiresAt };
}

/** Joins to the user in one query — every call site needs both. */
export async function getSessionUser(rawToken: string) {
  const [row] = await getDatabase()
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(rawToken)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row?.user;
}

export async function destroySession(rawToken: string) {
  await getDatabase().delete(sessions).where(eq(sessions.tokenHash, hashToken(rawToken)));
}

/** After a password change: every device signs in again. */
export async function destroyUserSessions(userId: string) {
  await getDatabase().delete(sessions).where(eq(sessions.userId, userId));
}
