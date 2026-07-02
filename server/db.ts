import { eq, and, desc, sum, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  InsertStudent,
  students,
  InsertApplication,
  applications,
  InsertDocument,
  documents,
  InsertTutor,
  tutors,
  InsertReferral,
  referrals,
  InsertMentor,
  mentors,
  InsertMessage,
  messages,
  InsertCohort,
  cohorts,
  InsertCohortMember,
  cohortMembers,
  InsertSkill,
  skills,
  InsertNotification,
  notifications,
  aiChatMessages,
  InsertAiChatMessage,
  aiMemories,
  InsertAiMemory,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPushToken(userId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ expoPushToken: token } as any).where(eq(users.id, userId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// STUDENT FUNCTIONS
// ============================================================================

export async function createStudent(data: InsertStudent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(students).values(data);
  return result;
}

export async function getStudentById(studentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllStudents() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(students);
}

export async function getStudent(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateStudent(userId: number, data: Partial<InsertStudent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(students).set(data).where(eq(students.userId, userId));
}

// ============================================================================
// APPLICATION FUNCTIONS
// ============================================================================

export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(applications).values(data);
  return result;
}

export async function getApplicationsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(applications).where(eq(applications.studentId, studentId));
}

export async function getApplication(applicationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateApplicationStatus(applicationId: number, status: string, updatedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(applications).set({
    applicationStatus: status as any,
    lastUpdatedBy: updatedBy,
    lastUpdatedAt: new Date(),
  }).where(eq(applications.id, applicationId));
}

// ============================================================================
// DOCUMENT FUNCTIONS
// ============================================================================

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return result;
}

export async function getDocumentsByApplication(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.applicationId, applicationId));
}

// ============================================================================
// TUTOR FUNCTIONS
// ============================================================================

export async function createTutor(data: InsertTutor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tutors).values(data);
  return result;
}

export async function getAllApplications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(applications).orderBy(desc(applications.updatedAt));
}

export async function updateApplicationMentor(applicationId: number, mentorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(applications).set({ mentorAssigned: mentorUserId }).where(eq(applications.id, applicationId));
}

export async function getTutor(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tutors).where(eq(tutors.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTutorByReferralCode(referralCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tutors).where(eq(tutors.referralCode, referralCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// REFERRAL FUNCTIONS
// ============================================================================

export async function createReferral(data: InsertReferral) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(referrals).values(data);
  return result;
}

export async function getReferralsByTutor(tutorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(referrals).where(eq(referrals.tutorId, tutorId));
}

export async function getReferralByStudentAndTutor(studentId: number, tutorId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(referrals).where(
    and(eq(referrals.studentId, studentId), eq(referrals.tutorId, tutorId))
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllTutors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tutors);
}

export async function getPendingCommissionByTutor(tutorId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "0";
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${referrals.commissionAmount} AS DECIMAL(15,2))), 0)` })
    .from(referrals)
    .where(and(eq(referrals.tutorId, tutorId), eq(referrals.commissionStatus, "pending")));
  return result[0]?.total ?? "0";
}

export async function updateReferralStatus(referralId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referrals).set({ commissionStatus: status as any }).where(eq(referrals.id, referralId));
}

export async function updateStudentTelegramChatId(studentId: number, chatId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(students).set({ telegramChatId: chatId } as any).where(eq(students.id, studentId));
}

export async function getStudentByTelegramLinkCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq((students as any).telegramLinkCode, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllMentors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(mentors).where(eq(mentors.verificationStatus, "verified"));
}

export async function updateReferralCommission(referralId: number, amount: string, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referrals).set({
    commissionAmount: amount,
    commissionStatus: status as any,
  }).where(eq(referrals.id, referralId));
}

// ============================================================================
// MENTOR FUNCTIONS
// ============================================================================

export async function createMentor(data: InsertMentor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mentors).values(data);
  return result;
}

export async function getMentor(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mentors).where(eq(mentors.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// MESSAGE FUNCTIONS
// ============================================================================

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  return result;
}

export async function getMessagesBetween(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(messages).where(
    and(
      eq(messages.senderId, userId1),
      eq(messages.recipientId, userId2)
    )
  ).orderBy(desc(messages.createdAt));
}

export async function markMessageAsRead(messageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(messages).set({ isRead: 1 }).where(eq(messages.id, messageId));
}

// ============================================================================
// COHORT FUNCTIONS
// ============================================================================

export async function createCohort(data: InsertCohort) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cohorts).values(data);
  return result;
}

export async function getAllCohorts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cohorts);
}

export async function addStudentToCohort(cohortId: number, studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cohortMembers).values({ cohortId, studentId });
  return result;
}

// ============================================================================
// SKILL FUNCTIONS
// ============================================================================

export async function createSkill(data: InsertSkill) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(skills).values(data);
  return result;
}

export async function getAllSkills() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(skills);
}

export async function getSkillsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(skills).where(eq(skills.category, category));
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result;
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, notificationId));
}

// ── AI Memory (MemPalace-style) ──────────────────────────────────────────────

export async function saveAIChatMessage(data: InsertAiChatMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiChatMessages).values(data);
}

export async function getAIChatHistory(studentId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.studentId, studentId))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function upsertAIMemory(studentId: number, memoryKey: string, memoryValue: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(aiMemories)
    .where(and(eq(aiMemories.studentId, studentId), eq(aiMemories.memoryKey, memoryKey)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(aiMemories)
      .set({ memoryValue })
      .where(and(eq(aiMemories.studentId, studentId), eq(aiMemories.memoryKey, memoryKey)));
  } else {
    await db.insert(aiMemories).values({ studentId, memoryKey, memoryValue });
  }
}

export async function getAIMemories(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiMemories).where(eq(aiMemories.studentId, studentId));
}
