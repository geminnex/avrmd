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
