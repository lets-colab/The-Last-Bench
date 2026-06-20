import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "tutor", "mentor"]).default("user").notNull(),
  expoPushToken: text("expoPushToken"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Student profiles - extends the users table with study-abroad specific info
 */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  class: varchar("class", { length: 50 }), // e.g., "HSC Final", "SSC Final"
  fieldOfInterest: varchar("fieldOfInterest", { length: 100 }), // e.g., "Engineering", "Business"
  destinationPreference: varchar("destinationPreference", { length: 100 }), // e.g., "Malaysia", "Canada"
  gpa: varchar("gpa", { length: 10 }), // e.g., "3.8", "4.0"
  transcriptUrl: text("transcriptUrl"), // S3 URL to uploaded transcript
  referralCode: varchar("referralCode", { length: 50 }), // Code of referring tutor (if applicable)
  telegramChatId: varchar("telegramChatId", { length: 100 }),
  whatsappPhone: varchar("whatsappPhone", { length: 20 }),
  telegramLinkCode: varchar("telegramLinkCode", { length: 10 }),
  notifyPush: int("notifyPush").default(1),
  notifyTelegram: int("notifyTelegram").default(0),
  notifyWhatsapp: int("notifyWhatsapp").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * Applications - tracks each student's university applications
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  universityName: varchar("universityName", { length: 255 }).notNull(),
  programName: varchar("programName", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }),
  applicationStatus: mysqlEnum("applicationStatus", [
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
  ]).default("draft").notNull(),
  estimatedCost: varchar("estimatedCost", { length: 50 }), // e.g., "$15000"
  visaSuccessRate: varchar("visaSuccessRate", { length: 10 }), // e.g., "95%"
  acceptanceRate: varchar("acceptanceRate", { length: 10 }), // e.g., "45%"
  mentorAssigned: int("mentorAssigned"), // User ID of assigned mentor
  lastUpdatedBy: int("lastUpdatedBy"), // User ID who last updated status
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow(),
  notes: text("notes"), // Internal notes about the application
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Documents - tracks uploaded files for applications
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(), // e.g., "transcript", "essay", "recommendation_letter"
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileName: varchar("fileName", { length: 255 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(), // User ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Tutors/Coaches - referral partners
 */
export const tutors = mysqlTable("tutors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  centerName: varchar("centerName", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  expertiseAreas: text("expertiseAreas"), // JSON array or comma-separated
  referralCode: varchar("referralCode", { length: 50 }).notNull().unique(),
  totalReferred: int("totalReferred").default(0),
  totalEarned: varchar("totalEarned", { length: 50 }).default("0"), // Total commission earned
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tutor = typeof tutors.$inferSelect;
export type InsertTutor = typeof tutors.$inferInsert;

/**
 * Referrals - tracks which tutor referred which student
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  tutorId: int("tutorId").notNull(),
  studentId: int("studentId").notNull(),
  referralCode: varchar("referralCode", { length: 50 }).notNull(),
  commissionPercentage: varchar("commissionPercentage", { length: 10 }).default("5"), // e.g., "5%"
  commissionAmount: varchar("commissionAmount", { length: 50 }), // e.g., "$500"
  commissionStatus: mysqlEnum("commissionStatus", ["pending", "earned", "paid"]).default("pending"),
  payoutMethod: varchar("payoutMethod", { length: 50 }), // e.g., "bKash", "Nagad"
  payoutDetails: text("payoutDetails"), // JSON with phone number, account details, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Mentors - users who guide students
 */
export const mentors = mysqlTable("mentors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  expertise: text("expertise"), // JSON array of expertise areas
  bio: text("bio"),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Mentor = typeof mentors.$inferSelect;
export type InsertMentor = typeof mentors.$inferInsert;

/**
 * Messages - direct messaging between students and mentors
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  content: text("content").notNull(),
  fileUrl: text("fileUrl"), // Optional file attachment
  isRead: int("isRead").default(0), // 0 = unread, 1 = read
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Cohorts - groups of students at similar stages
 */
export const cohorts = mysqlTable("cohorts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Class of 2026 - Malaysia Bound"
  description: text("description"),
  destination: varchar("destination", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = typeof cohorts.$inferInsert;

/**
 * Cohort members - tracks which students belong to which cohorts
 */
export const cohortMembers = mysqlTable("cohort_members", {
  id: int("id").autoincrement().primaryKey(),
  cohortId: int("cohortId").notNull(),
  studentId: int("studentId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CohortMember = typeof cohortMembers.$inferSelect;
export type InsertCohortMember = typeof cohortMembers.$inferInsert;

/**
 * Skills/Lessons - practical micro-content
 */
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., "AI Literacy", "Portfolio Building"
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner"),
  duration: varchar("duration", { length: 50 }), // e.g., "15 mins"
  content: text("content"), // Lesson content (markdown or HTML)
  videoUrl: text("videoUrl"), // Optional video
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

/**
 * Notifications - system notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g., "status_update", "mentor_message", "offer_received"
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedEntityId: int("relatedEntityId"), // e.g., application ID
  isRead: int("isRead").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
