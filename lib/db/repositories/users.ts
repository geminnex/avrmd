import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../client";
import { users } from "../schema";
import {
  emptyMemberProfile,
  type MemberProfile,
  type ProfessionalRole,
} from "@/lib/member-profile";
import type { PipelineStage } from "@/lib/catalog-types";

export type UserRecord = typeof users.$inferSelect;

/** The declarations, pulled off a row into the shape the UI works with. */
export function readMemberProfile(user: UserRecord): MemberProfile {
  return {
    ...emptyMemberProfile,
    roles: (user.roles ?? []) as ProfessionalRole[],
    stages: (user.stages ?? []) as PipelineStage[],
    canHelpWith: user.canHelpWith ?? [],
    lookingFor: user.lookingFor ?? [],
    topicInterests: user.topicInterests ?? [],
    affiliationSlug: user.affiliationSlug ?? null,
  };
}

export async function getUserByEmail(email: string) {
  const [user] = await getDatabase()
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return user;
}

export async function getUserById(id: string) {
  const [user] = await getDatabase().select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function getUserByHandle(handle: string) {
  const [user] = await getDatabase()
    .select()
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  return user;
}

/** Words a member can't take as a handle — they would read as the site speaking. */
export const reservedHandles = new Set([
  "admin", "administrator", "avrmd", "editor", "editors", "help", "moderator", "official",
  "root", "staff", "support", "system", "team", "me", "settings", "api",
]);

/**
 * A neutral handle for a new account. Never derived from the email address:
 * the handle is public, the address is not. Members choose their own later.
 */
async function generateUniqueHandle() {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `member-${randomBytes(4).toString("hex").slice(0, 6)}`;
    if (!(await getUserByHandle(candidate))) return candidate;
  }
  return `member-${Date.now().toString(36)}`;
}

/**
 * Proof of the address by any route other than the registration link (a
 * sign-in link, Google, a password reset) on a still-unverified account
 * discards that account's password. Otherwise someone could register a
 * victim's address with a password of their own and wait for the victim to
 * prove the address for them — account pre-hijacking.
 */
async function claimUnverified(user: UserRecord) {
  if (user.emailVerifiedAt) return user;
  const [updated] = await getDatabase()
    .update(users)
    .set({ emailVerifiedAt: new Date(), passwordHash: null, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();
  return updated;
}

/**
 * Idempotent: returns the existing user if the email is already registered.
 * Called only once an address is proven (a used sign-in link, or Google's
 * verified email).
 */
export async function findOrCreateUser(email: string, details: { displayName?: string } = {}) {
  const normalized = email.toLowerCase().trim();
  const existing = await getUserByEmail(normalized);
  if (existing) return claimUnverified(existing);

  const [created] = await getDatabase()
    .insert(users)
    .values({
      email: normalized,
      handle: await generateUniqueHandle(),
      displayName: details.displayName ?? null,
      emailVerifiedAt: new Date(),
    })
    .returning();
  return created;
}

/**
 * Google sign-in. The Google account id is the key; failing that, a matching
 * verified email links Google to the existing account, so a member who
 * started with a magic link keeps one account.
 */
export async function findOrCreateGoogleUser(claims: { sub: string; email: string; name?: string }) {
  const database = getDatabase();
  const [bySub] = await database.select().from(users).where(eq(users.googleSub, claims.sub)).limit(1);
  if (bySub) return bySub;

  const found = await getUserByEmail(claims.email);
  if (found) {
    const existing = await claimUnverified(found);
    const [linked] = await database
      .update(users)
      .set({
        googleSub: claims.sub,
        displayName: existing.displayName ?? claims.name ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();
    return linked;
  }

  const created = await findOrCreateUser(claims.email, { displayName: claims.name });
  const [linked] = await database
    .update(users)
    .set({ googleSub: claims.sub })
    .where(eq(users.id, created.id))
    .returning();
  return linked;
}

/**
 * Registration with a password. An unverified account for the same address
 * takes the newest password (the person who can read that inbox decides);
 * a verified account is never touched here — the caller emails its owner.
 */
export async function registerPasswordUser(email: string, passwordHash: string) {
  const normalized = email.toLowerCase().trim();
  const existing = await getUserByEmail(normalized);
  if (existing?.emailVerifiedAt) return { status: "exists" as const, user: existing };
  if (existing) {
    const [updated] = await getDatabase()
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, existing.id))
      .returning();
    return { status: "pending" as const, user: updated };
  }
  const [created] = await getDatabase()
    .insert(users)
    .values({ email: normalized, handle: await generateUniqueHandle(), passwordHash })
    .returning();
  return { status: "pending" as const, user: created };
}

/** The registration link: proves the address and keeps the password chosen with it. */
export async function confirmRegisteredEmail(email: string) {
  const user = await getUserByEmail(email);
  if (!user) return undefined;
  if (user.emailVerifiedAt) return user;
  const [updated] = await getDatabase()
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();
  return updated;
}

/** A reset link proves the address too, so it also settles an unverified account. */
export async function setPasswordAfterReset(email: string, passwordHash: string) {
  const user = await getUserByEmail(email);
  if (!user) return undefined;
  const [updated] = await getDatabase()
    .update(users)
    .set({ passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();
  return updated;
}

export async function updateUserProfile(
  id: string,
  fields: Partial<
    Pick<
      UserRecord,
      | "displayName"
      | "handle"
      | "bio"
      | "roles"
      | "stages"
      | "canHelpWith"
      | "lookingFor"
      | "topicInterests"
      | "affiliationSlug"
    >
  >,
) {
  const [updated] = await getDatabase()
    .update(users)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated;
}

export async function markEmailVerified(id: string) {
  await getDatabase()
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, id));
}

export type DirectoryMember = {
  id: string;
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  createdAt: Date;
  profile: MemberProfile;
};

/**
 * Everyone who has declared a role or a stage. Filtering happens in
 * application code against the file-based vocabularies (see
 * matchesDirectoryQuery) — this query only draws the line between "has said
 * something about themselves" and "has only ever signed in".
 */
export async function listDirectoryMembers(): Promise<DirectoryMember[]> {
  const rows = await getDatabase()
    .select()
    .from(users)
    .where(
      sql`jsonb_array_length(${users.roles}) > 0 OR jsonb_array_length(${users.stages}) > 0`,
    );

  return rows.map((user) => ({
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio,
    createdAt: user.createdAt,
    profile: readMemberProfile(user),
  }));
}

/**
 * Deletes the account. Sessions, profile, posts, comments, likes, follows,
 * questions, answers, notifications, talks and contributions go with it
 * (foreign keys cascade).
 */
export async function deleteUser(id: string) {
  await getDatabase().delete(users).where(eq(users.id, id));
}
