import { integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Enum types. Postgres enums are named types in the schema, so each gets a
 * unique name (unlike MySQL's inline per-column enums).
 */
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "tutor", "mentor"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "documents_received",
  "profile_analyzed",
  "shortlisted",
  "application_drafted",
  "submitted_to_university",
  "under_review",
  "offer_received",
  "visa_application_filed",
  "visa_decision",
  "pre_departure",
  "rejected",
]);
export const tutorStatusEnum = pgEnum("tutor_status", ["active", "inactive", "suspended"]);
export const commissionStatusEnum = pgEnum("commission_status", ["pending", "earned", "paid"]);
export const payoutMethodEnum = pgEnum("payout_method", ["bKash", "Nagad"]);
export const payoutStatusEnum = pgEnum("payout_status", ["requested", "approved", "rejected", "paid"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);
// The three founder-trained AI advisors — see server/routers.ts aiGuidance for each persona's prompt.
export const aiGuideEnum = pgEnum("ai_guide", ["sayem", "fahim", "erfan"]);
export type AiGuide = "sayem" | "fahim" | "erfan";
export const errorStatusEnum = pgEnum("error_status", ["open", "diagnosed", "healed", "ignored"]);
export const fixStrategyEnum = pgEnum("fix_strategy", ["retry", "fallback", "degrade", "reconnect", "manual"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  expoPushToken: text("expoPushToken"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Student profiles - extends the users table with study-abroad specific info
 */
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  class: varchar("class", { length: 50 }), // e.g., "HSC Final", "SSC Final"
  fieldOfInterest: varchar("fieldOfInterest", { length: 100 }), // e.g., "Engineering", "Business"
  destinationPreference: varchar("destinationPreference", { length: 100 }), // e.g., "Malaysia", "Canada"
  gpa: varchar("gpa", { length: 10 }), // e.g., "3.8", "4.0"
  transcriptUrl: text("transcriptUrl"), // S3 URL to uploaded transcript
  referralCode: varchar("referralCode", { length: 50 }), // Code of referring tutor (if applicable)
  telegramChatId: varchar("telegramChatId", { length: 100 }),
  whatsappPhone: varchar("whatsappPhone", { length: 20 }),
  telegramLinkCode: varchar("telegramLinkCode", { length: 10 }),
  notifyPush: integer("notifyPush").default(1),
  notifyTelegram: integer("notifyTelegram").default(0),
  notifyWhatsapp: integer("notifyWhatsapp").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * Applications - tracks each student's university applications
 */
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  universityName: varchar("universityName", { length: 255 }).notNull(),
  programName: varchar("programName", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }),
  applicationStatus: applicationStatusEnum("applicationStatus").default("draft").notNull(),
  estimatedCost: varchar("estimatedCost", { length: 50 }), // e.g., "$15000"
  visaSuccessRate: varchar("visaSuccessRate", { length: 10 }), // e.g., "95%"
  acceptanceRate: varchar("acceptanceRate", { length: 10 }), // e.g., "45%"
  mentorAssigned: integer("mentorAssigned"), // User ID of assigned mentor
  lastUpdatedBy: integer("lastUpdatedBy"), // User ID who last updated status
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow(),
  notes: text("notes"), // Internal notes about the application
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Documents - tracks uploaded files for applications
 */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("applicationId").notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(), // e.g., "transcript", "essay", "recommendation_letter"
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileName: varchar("fileName", { length: 255 }).notNull(),
  uploadedBy: integer("uploadedBy").notNull(), // User ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Tutors/Coaches - referral partners
 */
export const tutors = pgTable("tutors", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  centerName: varchar("centerName", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  expertiseAreas: text("expertiseAreas"), // JSON array or comma-separated
  referralCode: varchar("referralCode", { length: 50 }).notNull().unique(),
  totalReferred: integer("totalReferred").default(0),
  totalEarned: varchar("totalEarned", { length: 50 }).default("0"), // Total commission earned
  status: tutorStatusEnum("status").default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Tutor = typeof tutors.$inferSelect;
export type InsertTutor = typeof tutors.$inferInsert;

/**
 * Referrals - tracks which tutor referred which student
 */
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutorId").notNull(),
  studentId: integer("studentId").notNull(),
  referralCode: varchar("referralCode", { length: 50 }).notNull(),
  commissionPercentage: varchar("commissionPercentage", { length: 10 }).default("5"), // e.g., "5%"
  commissionAmount: varchar("commissionAmount", { length: 50 }), // e.g., "$500"
  commissionStatus: commissionStatusEnum("commissionStatus").default("pending"),
  payoutMethod: varchar("payoutMethod", { length: 50 }), // e.g., "bKash", "Nagad"
  payoutDetails: text("payoutDetails"), // JSON with phone number, account details, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Mentors - users who guide students
 */
export const mentors = pgTable("mentors", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  expertise: text("expertise"), // JSON array of expertise areas
  bio: text("bio"),
  verificationStatus: verificationStatusEnum("verificationStatus").default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Mentor = typeof mentors.$inferSelect;
export type InsertMentor = typeof mentors.$inferInsert;

/**
 * Messages - direct messaging between students and mentors
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  recipientId: integer("recipientId").notNull(),
  content: text("content").notNull(),
  fileUrl: text("fileUrl"), // Optional file attachment
  isRead: integer("isRead").default(0), // 0 = unread, 1 = read
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Cohorts - groups of students at similar stages
 */
export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Class of 2026 - Malaysia Bound"
  description: text("description"),
  destination: varchar("destination", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = typeof cohorts.$inferInsert;

/**
 * Cohort members - tracks which students belong to which cohorts
 */
export const cohortMembers = pgTable("cohort_members", {
  id: serial("id").primaryKey(),
  cohortId: integer("cohortId").notNull(),
  studentId: integer("studentId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CohortMember = typeof cohortMembers.$inferSelect;
export type InsertCohortMember = typeof cohortMembers.$inferInsert;

/**
 * Skills/Lessons - practical micro-content
 */
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., "AI Literacy", "Portfolio Building"
  difficulty: difficultyEnum("difficulty").default("beginner"),
  duration: varchar("duration", { length: 50 }), // e.g., "15 mins"
  content: text("content"), // Lesson content (markdown or HTML)
  videoUrl: text("videoUrl"), // Optional video
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

/**
 * Notifications - system notifications
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g., "status_update", "mentor_message", "offer_received"
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedEntityId: integer("relatedEntityId"), // e.g., application ID
  isRead: integer("isRead").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;


/**
 * AI Chat Messages — persistent memory layer (MemPalace-style)
 * Stores every exchange between student and AI advisor across sessions.
 */
export const aiChatMessages = pgTable("aiChatMessages", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  // Which of the three founder-trained AI advisors this message belongs to.
  // Defaults to "sayem" (the main journey AI) so existing rows stay valid.
  guide: aiGuideEnum("guide").notNull().default("sayem"),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = typeof aiChatMessages.$inferInsert;

/**
 * AI Memories — extracted facts about each student.
 * Key-value store of things the AI has learned (goals, concerns, preferences).
 */
export const aiMemories = pgTable(
  "aiMemories",
  {
    id: serial("id").primaryKey(),
    studentId: integer("studentId").notNull(),
    memoryKey: varchar("memoryKey", { length: 100 }).notNull(), // e.g., "target_university", "main_concern"
    memoryValue: text("memoryValue").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    // One memory per key per student — upsertAIMemory relies on this to stay atomic.
    studentKeyUnique: uniqueIndex("aiMemories_studentId_memoryKey_unique").on(table.studentId, table.memoryKey),
  }),
);

export type AiMemory = typeof aiMemories.$inferSelect;
export type InsertAiMemory = typeof aiMemories.$inferInsert;

/**
 * Error Logs — every error the system encounters, deduplicated by signature.
 * The self-healing engine reads these to diagnose and fix recurring problems.
 */
export const errorLogs = pgTable(
  "errorLogs",
  {
  id: serial("id").primaryKey(),
  signature: varchar("signature", { length: 191 }).notNull(), // normalized fingerprint of the error
  source: varchar("source", { length: 191 }).notNull(), // e.g. "trpc:aiGuidance.chat", "express", "process"
  message: text("message").notNull(),
  stack: text("stack"),
  context: text("context"), // JSON: input shape, user role, etc. (no PII)
  status: errorStatusEnum("status").default("open").notNull(),
  occurrences: integer("occurrences").default(1).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    // One log row per signature — logError upserts atomically against this.
    signatureUnique: uniqueIndex("errorLogs_signature_unique").on(table.signature),
  }),
);

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

/**
 * Error Fixes — the knowledge base the system learns from.
 * Each row is a diagnosis + fix strategy for an error signature, with a
 * running success/failure score. Successful strategies are fed back into
 * future diagnoses, so every fix makes the system smarter.
 */
export const errorFixes = pgTable("errorFixes", {
  id: serial("id").primaryKey(),
  errorSignature: varchar("errorSignature", { length: 191 }).notNull(),
  diagnosis: text("diagnosis").notNull(), // AI root-cause analysis
  fixStrategy: fixStrategyEnum("fixStrategy").notNull(),
  fixDetail: text("fixDetail"), // AI-suggested remediation steps
  autoApplied: integer("autoApplied").default(0).notNull(), // 1 if the engine applied it automatically
  successCount: integer("successCount").default(0).notNull(),
  failureCount: integer("failureCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ErrorFix = typeof errorFixes.$inferSelect;
export type InsertErrorFix = typeof errorFixes.$inferInsert;

/**
 * Payouts — tutor commission payout requests and their lifecycle.
 * A tutor requests a payout for earned commission; ops approves/rejects and
 * marks it paid once the bKash/Nagad transfer is done.
 */
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutorId").notNull(),
  amount: varchar("amount", { length: 50 }).notNull(), // in BDT, stored as string like the other money fields
  method: payoutMethodEnum("method").notNull(),
  accountNumber: varchar("accountNumber", { length: 30 }).notNull(), // mobile wallet number
  status: payoutStatusEnum("status").default("requested").notNull(),
  adminNote: text("adminNote"), // rejection reason or payment reference
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"), // set when approved/rejected/paid
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;

/**
 * Audit Logs — immutable trail of privileged state changes
 * (application status, commission status, payout lifecycle).
 */
export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId").notNull(), // users.id of the admin/user who acted
  action: varchar("action", { length: 100 }).notNull(), // e.g. "application.status_change"
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g. "application", "payout"
  entityId: integer("entityId").notNull(),
  detail: text("detail"), // JSON: { from, to, note, ... }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Cohort Messages — discussion feed inside a cohort space.
 */
export const cohortMessages = pgTable("cohort_messages", {
  id: serial("id").primaryKey(),
  cohortId: integer("cohortId").notNull(),
  studentId: integer("studentId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CohortMessage = typeof cohortMessages.$inferSelect;
export type InsertCohortMessage = typeof cohortMessages.$inferInsert;
