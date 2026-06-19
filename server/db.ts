import { eq, and, desc } from "drizzle-orm";
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
