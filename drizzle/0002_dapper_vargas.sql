CREATE TYPE "public"."following_type" AS ENUM('user', 'entity');--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_type" "following_type" NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "follows_unique" ON "follows" USING btree ("follower_id","following_type","following_id");--> statement-breakpoint
CREATE INDEX "follows_target_idx" ON "follows" USING btree ("following_type","following_id");