import { and, desc, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDatabase } from "../client";
import { invitations, users } from "../schema";
import { generateToken, hashToken } from "../../auth/tokens";

/** Long enough for a busy clinician to get round to it. */
export const invitationLifetime = 30 * 24 * 60 * 60 * 1000;

export async function createInvitation(input: { email: string; name?: string; note?: string; invitedById: string }) {
  const raw = generateToken();
  const [row] = await getDatabase()
    .insert(invitations)
    .values({
      email: input.email.toLowerCase().trim(),
      name: input.name || null,
      note: input.note || null,
      invitedById: input.invitedById,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + invitationLifetime),
    })
    .returning();
  return { raw, invitation: row };
}

const live = (rawToken: string) =>
  and(eq(invitations.tokenHash, hashToken(rawToken)), gt(invitations.expiresAt, new Date()), isNull(invitations.acceptedAt));

/** What the join page shows, without using the link up. */
export async function peekInvitation(rawToken: string) {
  const [row] = await getDatabase()
    .select({
      email: invitations.email,
      name: invitations.name,
      note: invitations.note,
      inviterName: users.displayName,
    })
    .from(invitations)
    .leftJoin(users, eq(users.id, invitations.invitedById))
    .where(live(rawToken))
    .limit(1);
  return row;
}

/** Spends the link. One conditional UPDATE, so it works exactly once. */
export async function acceptInvitation(rawToken: string) {
  const [row] = await getDatabase()
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(live(rawToken))
    .returning({ email: invitations.email, name: invitations.name });
  return row;
}

/** Newest first, with whether the person has since joined by any route. */
export async function listInvitations(limit = 100) {
  const rows = await getDatabase()
    .select({
      invitation: invitations,
      inviterName: users.displayName,
    })
    .from(invitations)
    .leftJoin(users, eq(users.id, invitations.invitedById))
    .orderBy(desc(invitations.createdAt))
    .limit(limit);
  const emails = [...new Set(rows.map((row) => row.invitation.email))];
  const joined = emails.length
    ? await getDatabase()
        .select({ email: users.email })
        .from(users)
        .where(and(inArray(users.email, emails), isNotNull(users.emailVerifiedAt)))
    : [];
  const members = new Set(joined.map((user) => user.email));
  return rows.map((row) => ({ ...row, joined: members.has(row.invitation.email) }));
}
