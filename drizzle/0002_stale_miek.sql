CREATE TYPE "public"."ai_guide" AS ENUM('sayem', 'fahim', 'erfan');--> statement-breakpoint
ALTER TABLE "aiChatMessages" ADD COLUMN "guide" "ai_guide" DEFAULT 'sayem' NOT NULL;