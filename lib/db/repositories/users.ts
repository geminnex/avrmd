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
 * Idempotent: returns the existing user if the email is already registered.
 * Called only once an address is proven (a used magic link, or Google's
 * verified email), so unverified addresses never create accounts.
 */
export async function findOrCreateUser(email: string, details: { displayName?: string } = {}) {
  const normalized = email.toLowerCase().trim();
  const existing = await getUserByEmail(normalized);
  if (existing) return existing;

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

  const existing = await getUserByEmail(claims.email);
  if (existing) {
    const [linked] = await database
      .update(users)
      .set({
        googleSub: claims.sub,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
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
