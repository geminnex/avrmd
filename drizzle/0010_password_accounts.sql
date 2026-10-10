CREATE TYPE "public"."token_purpose" AS ENUM('sign_in', 'verify_email', 'reset_password');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN "purpose" "token_purpose" DEFAULT 'sign_in' NOT NULL;