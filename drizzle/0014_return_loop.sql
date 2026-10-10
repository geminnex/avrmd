ALTER TABLE "moderation_reports" DROP CONSTRAINT "moderation_reports_reporter_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_prefs" jsonb DEFAULT '{"questions":true,"answers":true,"digest":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;