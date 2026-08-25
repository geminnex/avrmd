CREATE TYPE "public"."talk_status" AS ENUM('visible', 'hidden');--> statement-breakpoint
CREATE TABLE "talks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitted_by" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"speakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"url" text NOT NULL,
	"host_label" text NOT NULL,
	"topic_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"facets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "talk_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talks" ADD CONSTRAINT "talks_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "talks_slug_idx" ON "talks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "talks_status_idx" ON "talks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "talks_submitter_idx" ON "talks" USING btree ("submitted_by");