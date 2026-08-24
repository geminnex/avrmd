-- organization_memberships has never been written to (0 rows) — retargeted
-- from a Postgres `entities` FK to a catalog slug, matching follows/posts/
-- community_threads from earlier migrations. Safe to drop and recreate the
-- column outright since there is no data to preserve.
--
-- (This table's rename slipped through migration 0003 uncaught: drizzle-kit's
-- interactive rename prompt silently failed non-interactively at the time,
-- leaving the live table on the old shape until this migration.)
ALTER TABLE "organization_memberships" DROP CONSTRAINT IF EXISTS "organization_memberships_entity_id_entities_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "organization_memberships_unique";--> statement-breakpoint
ALTER TABLE "organization_memberships" DROP COLUMN IF EXISTS "entity_id";--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN "entity_slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_unique" ON "organization_memberships" USING btree ("entity_slug","user_id");
