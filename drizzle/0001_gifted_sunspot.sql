CREATE TYPE "public"."payout_method" AS ENUM('bKash', 'Nagad');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('requested', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorUserId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" integer NOT NULL,
	"detail" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohort_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohortId" integer NOT NULL,
	"studentId" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tutorId" integer NOT NULL,
	"amount" varchar(50) NOT NULL,
	"method" "payout_method" NOT NULL,
	"accountNumber" varchar(30) NOT NULL,
	"status" "payout_status" DEFAULT 'requested' NOT NULL,
	"adminNote" text,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "aiMemories_studentId_memoryKey_unique" ON "aiMemories" USING btree ("studentId","memoryKey");--> statement-breakpoint
CREATE UNIQUE INDEX "errorLogs_signature_unique" ON "errorLogs" USING btree ("signature");