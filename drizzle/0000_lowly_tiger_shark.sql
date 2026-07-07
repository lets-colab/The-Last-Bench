CREATE TYPE "public"."application_status" AS ENUM('draft', 'documents_received', 'profile_analyzed', 'shortlisted', 'application_drafted', 'submitted_to_university', 'under_review', 'offer_received', 'visa_application_filed', 'visa_decision', 'pre_departure', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending', 'earned', 'paid');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."error_status" AS ENUM('open', 'diagnosed', 'healed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."fix_strategy" AS ENUM('retry', 'fallback', 'degrade', 'reconnect', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tutor_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'tutor', 'mentor');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "aiChatMessages" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aiMemories" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"memoryKey" varchar(100) NOT NULL,
	"memoryValue" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"universityName" varchar(255) NOT NULL,
	"programName" varchar(255) NOT NULL,
	"country" varchar(100),
	"applicationStatus" "application_status" DEFAULT 'draft' NOT NULL,
	"estimatedCost" varchar(50),
	"visaSuccessRate" varchar(10),
	"acceptanceRate" varchar(10),
	"mentorAssigned" integer,
	"lastUpdatedBy" integer,
	"lastUpdatedAt" timestamp DEFAULT now(),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohort_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohortId" integer NOT NULL,
	"studentId" integer NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"destination" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicationId" integer NOT NULL,
	"documentType" varchar(100) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"uploadedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "errorFixes" (
	"id" serial PRIMARY KEY NOT NULL,
	"errorSignature" varchar(191) NOT NULL,
	"diagnosis" text NOT NULL,
	"fixStrategy" "fix_strategy" NOT NULL,
	"fixDetail" text,
	"autoApplied" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "errorLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"signature" varchar(191) NOT NULL,
	"source" varchar(191) NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"context" text,
	"status" "error_status" DEFAULT 'open' NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentors" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"expertise" text,
	"bio" text,
	"verificationStatus" "verification_status" DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"senderId" integer NOT NULL,
	"recipientId" integer NOT NULL,
	"content" text NOT NULL,
	"fileUrl" text,
	"isRead" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"relatedEntityId" integer,
	"isRead" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tutorId" integer NOT NULL,
	"studentId" integer NOT NULL,
	"referralCode" varchar(50) NOT NULL,
	"commissionPercentage" varchar(10) DEFAULT '5',
	"commissionAmount" varchar(50),
	"commissionStatus" "commission_status" DEFAULT 'pending',
	"payoutMethod" varchar(50),
	"payoutDetails" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"difficulty" "difficulty" DEFAULT 'beginner',
	"duration" varchar(50),
	"content" text,
	"videoUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"class" varchar(50),
	"fieldOfInterest" varchar(100),
	"destinationPreference" varchar(100),
	"gpa" varchar(10),
	"transcriptUrl" text,
	"referralCode" varchar(50),
	"telegramChatId" varchar(100),
	"whatsappPhone" varchar(20),
	"telegramLinkCode" varchar(10),
	"notifyPush" integer DEFAULT 1,
	"notifyTelegram" integer DEFAULT 0,
	"notifyWhatsapp" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutors" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"centerName" varchar(255) NOT NULL,
	"location" varchar(255),
	"expertiseAreas" text,
	"referralCode" varchar(50) NOT NULL,
	"totalReferred" integer DEFAULT 0,
	"totalEarned" varchar(50) DEFAULT '0',
	"status" "tutor_status" DEFAULT 'active',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tutors_referralCode_unique" UNIQUE("referralCode")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"expoPushToken" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
-- Postgres has no MySQL-style ON UPDATE CURRENT_TIMESTAMP, so a trigger
-- reproduces the auto-bump behavior the schema previously got for free.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION touch_last_seen_at() RETURNS trigger AS $$
BEGIN
  NEW."lastSeenAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "students" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "applications" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "tutors" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "referrals" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "mentors" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "cohorts" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "skills" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "aiMemories" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "errorFixes" FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_last_seen_at BEFORE UPDATE ON "errorLogs" FOR EACH ROW EXECUTE FUNCTION touch_last_seen_at();
