CREATE TYPE "public"."agent_task_status" AS ENUM('queued', 'running', 'review', 'approved', 'rejected', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "agent_settings" (
	"agent_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"auto_assign" boolean DEFAULT false NOT NULL,
	"daily_limit" integer DEFAULT 20 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"instructions" text,
	"status" "agent_task_status" DEFAULT 'queued' NOT NULL,
	"output" jsonb,
	"error" text,
	"created_by_id" uuid,
	"reviewed_by_id" uuid,
	"review_note" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "agent_tasks_agent_idx" ON "agent_tasks" USING btree ("agent_id","created_at");