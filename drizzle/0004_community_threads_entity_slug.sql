-- community_threads has never been written to (0 rows) — retargeted from a
-- Postgres `entities` FK to a catalog slug, matching follows/posts/
-- organization_memberships from earlier migrations. Safe to drop and
-- recreate the column outright since there is no data to preserve.
ALTER TABLE "community_threads" DROP CONSTRAINT IF EXISTS "community_threads_entity_id_entities_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "community_threads_entity_idx";--> statement-breakpoint
ALTER TABLE "community_threads" DROP COLUMN IF EXISTS "entity_id";--> statement-breakpoint
ALTER TABLE "community_threads" ADD COLUMN "entity_slug" text NOT NULL;--> statement-breakpoint
CREATE INDEX "community_threads_entity_idx" ON "community_threads" USING btree ("entity_slug","updated_at");
