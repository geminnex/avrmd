import { and, eq } from "drizzle-orm";
import { getDatabase } from "../client";
import { organizationMemberships } from "../schema";

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
