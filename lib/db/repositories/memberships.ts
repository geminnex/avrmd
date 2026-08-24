import { and, eq } from "drizzle-orm";
import { getDatabase } from "../client";
import { organizationMemberships, users } from "../schema";

export async function getUserMembership(userId: string, entitySlug: string) {
  const [row] = await getDatabase()
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.entitySlug, entitySlug),
      ),
    )
    .limit(1);
  return row;
}

export async function listUserMemberships(userId: string) {
  return getDatabase()
    .select()
    .from(organizationMemberships)
    .where(eq(organizationMemberships.userId, userId));
}

/** Idempotent — granting the same role twice updates rather than duplicating. */
export async function grantMembership(entitySlug: string, userId: string, role: string) {
  const [membership] = await getDatabase()
    .insert(organizationMemberships)
    .values({ entitySlug, userId, role })
    .onConflictDoUpdate({
      target: [organizationMemberships.entitySlug, organizationMemberships.userId],
      set: { role },
    })
    .returning();
  return membership;
}

export async function getMembersForEntity(entitySlug: string) {
  return getDatabase()
    .select({ membership: organizationMemberships, handle: users.handle, displayName: users.displayName })
    .from(organizationMemberships)
    .innerJoin(users, eq(organizationMemberships.userId, users.id))
    .where(eq(organizationMemberships.entitySlug, entitySlug));
}
