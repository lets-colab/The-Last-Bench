import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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
  AiGuide,
  aiMemories,
  InsertAiMemory,
  payouts,
  InsertPayout,
  auditLogs,
  InsertAuditLog,
  cohortMessages,
  InsertCohortMessage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, { ssl: "require" });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Drop the cached connection so the next getDb() reconnects fresh.
// Used by the self-healing engine's "reconnect" strategy.
export function resetDb() {
  void _client?.end({ timeout: 1 }).catch(() => {});
  _db = null;
  _client = null;
}

// Idempotent, boot-time schema guarantees. This project's Drizzle migration
// journal is out of sync with the live DB (several tables were applied directly
// via Supabase SQL), so instead of `drizzle-kit migrate` we make the server
// self-heal its own schema on startup — matching the app's self-healing ethos.
// Every statement here MUST be safe to run repeatedly. Call from startServer()
// and AWAIT it before the server begins serving, so no request hits a missing
// column. See drizzle/0002_ai_guide_personas.sql for the canonical DDL.
export async function ensureSchema() {
  const db = await getDb();
  if (!db) {
    console.warn("[schema] no database — skipping ensureSchema");
    return;
  }
  try {
    // CREATE TYPE has no IF NOT EXISTS; swallow duplicate_object on re-run.
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE ai_guide AS ENUM ('sayem', 'fahim', 'erfan');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await db.execute(sql`
      ALTER TABLE "aiChatMessages"
      ADD COLUMN IF NOT EXISTS "guide" ai_guide DEFAULT 'sayem' NOT NULL;
    `);
    console.log("[schema] ensured aiChatMessages.guide column");
  } catch (error) {
    // Non-fatal: the server still boots. If the column genuinely can't be
    // added, aiGuidance.chat's self-healing wrapper will surface it per-request.
    console.warn("[schema] ensureSchema failed (non-fatal):", error);
  }
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

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.openId, set: updateSet });
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
  // Both directions: a thread is everything either party sent the other.
  return await db.select().from(messages).where(
    or(
      and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
      and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
    )
  ).orderBy(desc(messages.createdAt));
}

export type ConversationSummary = {
  userId: number;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
};

// Distinct counterparties the user has exchanged messages with, newest first.
export async function getConversationsForUser(userId: number): Promise<ConversationSummary[]> {
  const db = await getDb();
  if (!db) return [];
  const involving = await db
    .select()
    .from(messages)
    .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
    .orderBy(desc(messages.createdAt));

  const byPartner = new Map<number, { last: (typeof involving)[number]; unread: number }>();
  for (const m of involving) {
    const partnerId = m.senderId === userId ? m.recipientId : m.senderId;
    const entry = byPartner.get(partnerId);
    const unreadInc = m.recipientId === userId && !m.isRead ? 1 : 0;
    if (!entry) {
      byPartner.set(partnerId, { last: m, unread: unreadInc });
    } else {
      entry.unread += unreadInc;
    }
  }
  if (byPartner.size === 0) return [];

  const partnerIds = Array.from(byPartner.keys());
  const partners = await db.select().from(users).where(inArray(users.id, partnerIds));
  const nameById = new Map(partners.map((u) => [u.id, u.name || "Member"]));

  return partnerIds.map((id) => {
    const { last, unread } = byPartner.get(id)!;
    return {
      userId: id,
      name: nameById.get(id) || "Member",
      lastMessage: last.content,
      lastMessageTime: last.createdAt,
      unreadCount: unread,
    };
  });
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

export async function getAIChatHistory(studentId: number, guide: AiGuide, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(aiChatMessages)
    .where(and(eq(aiChatMessages.studentId, studentId), eq(aiChatMessages.guide, guide)))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function upsertAIMemory(studentId: number, memoryKey: string, memoryValue: string) {
  const db = await getDb();
  if (!db) return;
  // Atomic against the (studentId, memoryKey) unique index — concurrent
  // writers can't create duplicate memories.
  await db
    .insert(aiMemories)
    .values({ studentId, memoryKey, memoryValue })
    .onConflictDoUpdate({
      target: [aiMemories.studentId, aiMemories.memoryKey],
      set: { memoryValue, updatedAt: new Date() },
    });
}

export async function getAIMemories(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiMemories).where(eq(aiMemories.studentId, studentId));
}

// ============================================================================
// PAYOUTS
// ============================================================================

export async function createPayout(data: InsertPayout) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db.insert(payouts).values(data).returning({ id: payouts.id });
  return row.id;
}

/**
 * Atomically reserve balance and create a payout request.
 * Locks the tutor row so concurrent requests serialize: the balance check and
 * the insert happen inside one transaction, closing the double-reserve race.
 * Reserved = payouts in ANY state except rejected — paid payouts permanently
 * consume balance until the underlying commissions are marked settled.
 */
export async function createPayoutReserved(
  tutorId: number,
  amountBdt: number,
  method: "bKash" | "Nagad",
  accountNumber: string,
): Promise<{ ok: true; payoutId: number } | { ok: false; available: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return await db.transaction(async (tx) => {
    // serialize per tutor
    await tx.select({ id: tutors.id }).from(tutors).where(eq(tutors.id, tutorId)).for("update");
    const [earnedRow] = await tx
      .select({ total: sql<string>`COALESCE(SUM(CAST(${referrals.commissionAmount} AS DECIMAL(15,2))), 0)` })
      .from(referrals)
      .where(and(eq(referrals.tutorId, tutorId), eq(referrals.commissionStatus, "earned")));
    const [reservedRow] = await tx
      .select({ total: sql<string>`COALESCE(SUM(CAST(${payouts.amount} AS DECIMAL(15,2))), 0)` })
      .from(payouts)
      .where(and(eq(payouts.tutorId, tutorId), sql`${payouts.status} <> 'rejected'`));
    const available = Math.max(0, parseFloat(earnedRow?.total ?? "0") - parseFloat(reservedRow?.total ?? "0"));
    if (amountBdt > available) return { ok: false as const, available };
    const [row] = await tx
      .insert(payouts)
      .values({ tutorId, amount: amountBdt.toFixed(2), method, accountNumber })
      .returning({ id: payouts.id });
    return { ok: true as const, payoutId: row.id };
  });
}

export async function getPayoutsByTutor(tutorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payouts).where(eq(payouts.tutorId, tutorId)).orderBy(desc(payouts.requestedAt));
}

export async function getAllPayouts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(payouts).orderBy(desc(payouts.requestedAt));
}

export async function getPayoutById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(payouts).where(eq(payouts.id, id)).limit(1);
  return rows[0];
}

export async function updatePayoutStatus(
  id: number,
  status: "approved" | "rejected" | "paid",
  adminNote?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(payouts)
    .set({ status, adminNote, resolvedAt: new Date() })
    .where(eq(payouts.id, id));
}

/**
 * Sum of a tutor's payouts that consume balance: requested, approved, AND paid.
 * Paid payouts stay counted — otherwise the same earned commission becomes
 * requestable again the moment ops marks a payout as paid.
 */
export async function getReservedPayoutTotalByTutor(tutorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ amount: payouts.amount })
    .from(payouts)
    .where(and(eq(payouts.tutorId, tutorId), sql`${payouts.status} <> 'rejected'`));
  return rows.reduce((total, row) => total + parseFloat(row.amount ?? "0"), 0);
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return; // never block the primary action on audit trouble
  try {
    await db.insert(auditLogs).values(data);
  } catch (error) {
    console.warn("[Audit] failed to record:", error);
  }
}

export async function getAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ============================================================================
// COHORT MESSAGES
// ============================================================================

export async function isCohortMember(cohortId: number, studentId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: cohortMembers.id })
    .from(cohortMembers)
    .where(and(eq(cohortMembers.cohortId, cohortId), eq(cohortMembers.studentId, studentId)))
    .limit(1);
  return rows.length > 0;
}

export async function getCohortById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(cohorts).where(eq(cohorts.id, id)).limit(1);
  return rows[0];
}

export async function getCohortMembers(cohortId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      studentId: cohortMembers.studentId,
      joinedAt: cohortMembers.joinedAt,
      name: users.name,
    })
    .from(cohortMembers)
    .innerJoin(students, eq(cohortMembers.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(cohortMembers.cohortId, cohortId));
}

export async function createCohortMessage(data: InsertCohortMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db.insert(cohortMessages).values(data).returning({ id: cohortMessages.id });
  return row.id;
}

export async function getCohortMessages(cohortId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: cohortMessages.id,
      cohortId: cohortMessages.cohortId,
      studentId: cohortMessages.studentId,
      content: cohortMessages.content,
      createdAt: cohortMessages.createdAt,
      senderName: users.name,
    })
    .from(cohortMessages)
    .innerJoin(students, eq(cohortMessages.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(cohortMessages.cohortId, cohortId))
    .orderBy(desc(cohortMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

// ============================================================================
// ADMIN ANALYTICS
// ============================================================================

export async function getAdminAnalytics() {
  const db = await getDb();
  if (!db) return undefined;
  const [studentCount] = await db.select({ n: sql<number>`COUNT(*)` }).from(students);
  const [tutorCount] = await db.select({ n: sql<number>`COUNT(*)` }).from(tutors);
  const appsByStatus = await db
    .select({ status: applications.applicationStatus, n: sql<number>`COUNT(*)` })
    .from(applications)
    .groupBy(applications.applicationStatus);
  const referralsByStatus = await db
    .select({ status: referrals.commissionStatus, n: sql<number>`COUNT(*)` })
    .from(referrals)
    .groupBy(referrals.commissionStatus);
  const payoutsByStatus = await db
    .select({
      status: payouts.status,
      n: sql<number>`COUNT(*)`,
      total: sql<string>`COALESCE(SUM(CAST(${payouts.amount} AS DECIMAL(12,2))), 0)`,
    })
    .from(payouts)
    .groupBy(payouts.status);
  return {
    students: Number(studentCount?.n ?? 0),
    tutors: Number(tutorCount?.n ?? 0),
    applicationsByStatus: appsByStatus.map((r) => ({ status: r.status, count: Number(r.n) })),
    referralsByStatus: referralsByStatus.map((r) => ({ status: r.status, count: Number(r.n) })),
    payoutsByStatus: payoutsByStatus.map((r) => ({ status: r.status, count: Number(r.n), total: r.total })),
  };
}

/** Sum of commissions the tutor has earned but not yet been paid. */
export async function getEarnedCommissionByTutor(tutorId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "0";
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${referrals.commissionAmount} AS DECIMAL(15,2))), 0)` })
    .from(referrals)
    .where(and(eq(referrals.tutorId, tutorId), eq(referrals.commissionStatus, "earned")));
  return result[0]?.total ?? "0";
}

export async function getTutorById(tutorId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(tutors).where(eq(tutors.id, tutorId)).limit(1);
  return rows[0];
}
