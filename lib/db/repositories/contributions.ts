import { getDatabase } from "../client";
import { contributions } from "../schema";

export async function createContribution(params: {
  userId: string;
  kind: "submission" | "claim" | "advertising" | "inquiry";
  entitySlug?: string | null;
  payload: Record<string, unknown>;
}) {
  const [row] = await getDatabase()
    .insert(contributions)
    .values({ ...params, entitySlug: params.entitySlug ?? null })
    .returning({ id: contributions.id });
  return row;
}

export async function listContributions(limit = 100) {
  const { desc, eq } = await import("drizzle-orm");
  const { users } = await import("../schema");
  return getDatabase()
    .select({ contribution: contributions, email: users.email, handle: users.handle })
    .from(contributions)
    .innerJoin(users, eq(users.id, contributions.userId))
    .orderBy(desc(contributions.createdAt))
    .limit(limit);
}

export async function setContributionStatus(id: string, status: "approved" | "rejected" | "submitted") {
  const { eq } = await import("drizzle-orm");
  const [row] = await getDatabase()
    .update(contributions)
    .set({ status })
    .where(eq(contributions.id, id))
    .returning({ id: contributions.id });
  return row;
}
