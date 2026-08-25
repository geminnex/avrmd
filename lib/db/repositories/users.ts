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

function slugifyHandle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** A profile page needs somewhere to live from the first sign-in, not just after a settings visit. */
async function generateUniqueHandle(email: string) {
  const base = slugifyHandle(email.split("@")[0]) || "member";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await getUserByHandle(candidate))) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** Idempotent: returns the existing user if the email is already registered. */
export async function findOrCreateUser(email: string) {
  const normalized = email.toLowerCase().trim();
  const existing = await getUserByEmail(normalized);
  if (existing) return existing;

  const [created] = await getDatabase()
    .insert(users)
    .values({ email: normalized, handle: await generateUniqueHandle(normalized) })
    .returning();
  return created;
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
