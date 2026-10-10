CREATE TYPE "public"."contribution_kind" AS ENUM('submission', 'claim', 'advertising', 'inquiry');--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "contribution_kind" NOT NULL,
	"entity_slug" text,
	"payload" jsonb NOT NULL,
	"status" "workflow_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contributions_status_idx" ON "contributions" USING btree ("status","created_at");