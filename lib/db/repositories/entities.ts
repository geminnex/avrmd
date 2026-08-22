import { and, asc, eq } from "drizzle-orm";
import type { EntityKind } from "@/lib/catalog-types";
import { getDatabase } from "../client";
import { entities } from "../schema";

export type EntityRecord = typeof entities.$inferSelect;

export async function listPublishedEntities(kind?: EntityKind) {
  const database = getDatabase();
  const publicationFilter = eq(entities.status, "published");
  const where = kind
    ? and(publicationFilter, eq(entities.kind, kind))
    : publicationFilter;

  return database.select().from(entities).where(where).orderBy(asc(entities.name));
}

export async function getPublishedEntityBySlug(slug: string) {
  const [entity] = await getDatabase()
    .select()
    .from(entities)
    .where(and(eq(entities.slug, slug), eq(entities.status, "published")))
    .limit(1);

  return entity;
}
