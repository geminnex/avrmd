CREATE TYPE "public"."entity_kind" AS ENUM('organization', 'solution', 'evidence', 'event', 'project', 'group');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('member', 'owner', 'editor', 'moderator', 'administrator');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('draft', 'submitted', 'in_review', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by_id" uuid,
	"job_type" text NOT NULL,
	"source_url" text,
	"rights_basis" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"zero_data_retention" boolean DEFAULT false NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"result" jsonb,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"entity_id" uuid,
	"field_path" text NOT NULL,
	"proposed_value" jsonb NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "workflow_status" DEFAULT 'in_review' NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_creatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"headline" text NOT NULL,
	"body" text NOT NULL,
	"destination_url" text NOT NULL,
	"disclosure_label" text DEFAULT 'Sponsored' NOT NULL,
	"review_status" "workflow_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"creative_id" uuid NOT NULL,
	"placement_type" text NOT NULL,
	"context_entity_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_entity_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"budget_minor" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"invoice_status" text DEFAULT 'not_issued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitter_id" uuid,
	"kind" "entity_kind" NOT NULL,
	"proposed_name" text NOT NULL,
	"source_url" text NOT NULL,
	"rights_basis" text NOT NULL,
	"status" "workflow_status" DEFAULT 'submitted' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"moderation_state" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid,
	"author_id" uuid NOT NULL,
	"thread_type" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"author_id" uuid,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"patch" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"session_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "entity_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"source_id" uuid NOT NULL,
	"extraction_method" text NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "workflow_status" DEFAULT 'submitted' NOT NULL,
	"assigned_to_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ownership_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"claimant_id" uuid NOT NULL,
	"work_email_domain" text NOT NULL,
	"relationship" text NOT NULL,
	"status" "workflow_status" DEFAULT 'submitted' NOT NULL,
	"evidence_expires_at" timestamp with time zone,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "private_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"assigned_membership_id" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"url" text NOT NULL,
	"publisher" text NOT NULL,
	"rights_basis" text NOT NULL,
	"license_url" text,
	"source_fingerprint" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"definition" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_run_id_ai_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_creatives" ADD CONSTRAINT "campaign_creatives_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_placements" ADD CONSTRAINT "campaign_placements_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_placements" ADD CONSTRAINT "campaign_placements_creative_id_campaign_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."campaign_creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_placements" ADD CONSTRAINT "campaign_placements_context_entity_id_entities_id_fk" FOREIGN KEY ("context_entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_entity_id_entities_id_fk" FOREIGN KEY ("organization_entity_id") REFERENCES "public"."entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_submissions" ADD CONSTRAINT "catalog_submissions_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_thread_id_community_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."community_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_placement_id_campaign_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."campaign_placements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_from_entity_id_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_to_entity_id_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_source_id_source_records_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_topics" ADD CONSTRAINT "entity_topics_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_topics" ADD CONSTRAINT "entity_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_topics" ADD CONSTRAINT "entity_topics_source_id_source_records_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_source_id_source_records_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_claimant_id_users_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_inquiries" ADD CONSTRAINT "private_inquiries_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_inquiries" ADD CONSTRAINT "private_inquiries_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_inquiries" ADD CONSTRAINT "private_inquiries_assigned_membership_id_organization_memberships_id_fk" FOREIGN KEY ("assigned_membership_id") REFERENCES "public"."organization_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_jobs_status_idx" ON "ai_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_job_idx" ON "ai_runs" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_suggestions_status_idx" ON "ai_suggestions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_resource_idx" ON "audit_events" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "campaign_creatives_campaign_idx" ON "campaign_creatives" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_placements_campaign_idx" ON "campaign_placements" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaign_placements_schedule_idx" ON "campaign_placements" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "campaign_placements_context_idx" ON "campaign_placements" USING btree ("context_entity_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_status_schedule_idx" ON "campaigns" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "catalog_submissions_status_idx" ON "catalog_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "community_posts_thread_idx" ON "community_posts" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "community_threads_entity_idx" ON "community_threads" USING btree ("entity_id","updated_at");--> statement-breakpoint
CREATE INDEX "content_revisions_entity_status_idx" ON "content_revisions" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "delivery_events_placement_idx" ON "delivery_events" USING btree ("placement_id","occurred_at");--> statement-breakpoint
CREATE INDEX "delivery_events_type_idx" ON "delivery_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "entities_slug_unique" ON "entities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "entities_kind_status_idx" ON "entities" USING btree ("kind","status");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_relations_unique" ON "entity_relations" USING btree ("from_entity_id","to_entity_id","relation_type");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_topics_unique" ON "entity_topics" USING btree ("entity_id","topic_id");--> statement-breakpoint
CREATE INDEX "entity_topics_topic_idx" ON "entity_topics" USING btree ("topic_id","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "field_provenance_unique" ON "field_provenance" USING btree ("entity_id","field_path","source_id");--> statement-breakpoint
CREATE INDEX "moderation_reports_status_idx" ON "moderation_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_unique" ON "organization_memberships" USING btree ("entity_id","user_id");--> statement-breakpoint
CREATE INDEX "ownership_claims_status_idx" ON "ownership_claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "private_inquiries_entity_status_idx" ON "private_inquiries" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "source_records_entity_idx" ON "source_records" USING btree ("entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_slug_unique" ON "topics" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_hash_unique" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_tokens_email_idx" ON "verification_tokens" USING btree ("email");