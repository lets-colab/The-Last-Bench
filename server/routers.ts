import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { canTransitionPayout, validatePayoutRequest } from "../shared/payout";
import type { Application, User } from "../drizzle/schema";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const malaysiaUniversities = require("./data/malaysia-universities.json") as Record<string, unknown>[];
const universityDirectory = malaysiaUniversities.map((university) => ({
  name: university.name,
  shortName: university.shortName,
  location: university.location,
  type: university.type,
  programs: university.programs,
}));

const applicationStatusSchema = z.enum([
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

const reviewedDocumentUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Document URL must use HTTPS",
  });

async function requireStudentProfile(userId: number) {
  const student = await db.getStudent(userId);
  if (!student) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Complete your student profile before using AI guidance.",
    });
  }
  return student;
}

async function requireApplicationAccess(
  user: Pick<User, "id" | "role">,
  applicationId: number,
) {
  const application = await db.getApplication(applicationId);
  if (!application) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
  }

  const canManage = user.role === "admin" || application.mentorAssigned === user.id;
  const student = canManage ? undefined : await db.getStudent(user.id);
  const ownsApplication = student?.id === application.studentId;

  if (!canManage && !ownsApplication) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this application",
    });
  }

  return { application, canViewInternalNotes: canManage };
}

function toStudentSafeApplication(application: Application) {
  const {
    notes: _internalNotes,
    estimatedCost: _unverifiedCost,
    visaSuccessRate: _unverifiedVisaRate,
    acceptanceRate: _unverifiedAcceptanceRate,
    ...studentSafeApplication
  } = application;
  return studentSafeApplication;
}

// The three founder-trained AI advisors. Each persona shares the student's
// memory file, so switching guides never loses context.
const AI_GUIDES = {
  sayem: {
    name: "Sayem Ahmed",
    systemPrompt: `You are Sayem's AI — trained by Sayem Ahmed, CEO and co-founder of Last Bench.
Sayem runs the whole student journey: you are the main advisor, focused on the student's
application pipeline, document tracker, and overall status. Speak like a founder who is
personally invested in this student succeeding — direct, warm, practical. You do not receive
live application or document status in this chat, so never claim that a stage is complete or a
document is approved; direct the student to their tracker or mentor for current status. When a
student asks something outside your lane (deep university comparisons, community connections),
answer what you can from the shared student file, then suggest they also ask Fahim's AI
(career/university matching) or Erfan's AI (community) by name.`,
  },
  fahim: {
    name: "Fahim Shahbaz",
    systemPrompt: `You are Fahim's AI — trained by Fahim Shahbaz, the career guide at Last Bench.
Fahim's expertise is helping students research universities and programs: comparing study areas,
questions to ask, and career directions. Treat all time-sensitive details
as unverified until the student checks an official university or government source. Speak like a
sharp, honest career counselor — give real tradeoffs, not just cheerleading. Defer to Sayem's AI
for tracker/document status questions, and to Erfan's AI for community questions.`,
  },
  erfan: {
    name: "Erfan Uddin",
    systemPrompt: `You are Erfan's AI — trained by Erfan Uddin, who runs the Last Bench community.
Erfan's focus is connecting students to each other and to the community: cohorts, peer support,
shared experience. You do NOT have access to a live feed of community posts or events — if asked
about specific threads, events, or other students, be honest that you don't have that data and
point them to the Community tab in the app instead of inventing anything. Speak like a warm,
plugged-in community organizer.`,
  },
} as const;

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================================================
  // STUDENT ROUTES
  // ============================================================================
  student: router({
    // Get or create student profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const student = await db.getStudent(ctx.user.id);
      return student;
    }),

    // Create student profile
    createProfile: protectedProcedure
      .input(
        z.object({
          class: z.string().trim().min(1).max(50).optional(),
          fieldOfInterest: z.string().trim().min(1).max(100).optional(),
          destinationPreference: z.string().trim().min(1).max(100).optional(),
          gpa: z.string().trim().max(10).optional(),
          referralCode: z.string().trim().max(50).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getStudent(ctx.user.id);
        if (existing) {
          await db.updateStudent(ctx.user.id, input);
        } else {
          await db.createStudent({
            userId: ctx.user.id,
            ...input,
          });
        }
        return await db.getStudent(ctx.user.id);
      }),

    // Update student profile
    updateProfile: protectedProcedure
      .input(
        z.object({
          class: z.string().trim().min(1).max(50).optional(),
          fieldOfInterest: z.string().trim().min(1).max(100).optional(),
          destinationPreference: z.string().trim().min(1).max(100).optional(),
          gpa: z.string().trim().max(10).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getStudent(ctx.user.id);
        if (existing) {
          await db.updateStudent(ctx.user.id, input);
        } else {
          await db.createStudent({ userId: ctx.user.id, ...input });
        }
        return { success: true };
      }),

    // Upload transcript
    uploadTranscript: protectedProcedure
      .input(z.object({ transcriptUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateStudent(ctx.user.id, { transcriptUrl: input.transcriptUrl });
        return { success: true };
      }),
  }),

  // ============================================================================
  // APPLICATION ROUTES
  // ============================================================================
  application: router({
    // Get all applications for a student
    getByStudent: protectedProcedure.query(async ({ ctx }) => {
      const student = await db.getStudent(ctx.user.id);
      if (!student) return [];
      const studentApplications = await db.getApplicationsByStudent(student.id);
      return studentApplications.map(toStudentSafeApplication);
    }),

    // Get single application
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { application, canViewInternalNotes } = await requireApplicationAccess(
          ctx.user,
          input.id,
        );
        if (canViewInternalNotes) return application;

        return toStudentSafeApplication(application);
      }),

    // Create application
    create: protectedProcedure
      .input(
        z.object({
          universityName: z.string().trim().min(2).max(255),
          programName: z.string().trim().min(2).max(255),
          country: z.string().trim().min(2).max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const student = await db.getStudent(ctx.user.id);
        if (!student) throw new Error("Student profile not found");

        const result = await db.createApplication({
          studentId: student.id,
          ...input,
          applicationStatus: "draft",
        });
        return result;
      }),

    // Update application status (admin/mentor only)
    updateStatus: protectedProcedure
      .input(
        z.object({
          applicationId: z.number(),
          status: applicationStatusSchema,
          notes: z.string().trim().max(5000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const app = await db.getApplication(input.applicationId);
        if (!app) throw new Error("Application not found");
        const isAdmin = ctx.user.role === "admin";
        const isMentor = app.mentorAssigned === ctx.user.id;
        if (!isAdmin && !isMentor) {
          throw new Error("Not authorized to update this application");
        }
        await db.updateApplicationStatus(
          input.applicationId,
          input.status,
          ctx.user.id,
          input.notes,
        );
        return { success: true };
      }),
  }),

  // ============================================================================
  // DOCUMENT ROUTES
  // ============================================================================
  document: router({
    // Get documents for an application
    getByApplication: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireApplicationAccess(ctx.user, input.applicationId);
        return await db.getDocumentsByApplication(input.applicationId);
      }),

    // Register a document that an assigned mentor or admin has already
    // reviewed and placed in the approved HTTPS storage flow.
    upload: protectedProcedure
      .input(
        z.object({
          applicationId: z.number(),
          documentType: z.string().trim().min(1).max(80),
          fileUrl: reviewedDocumentUrlSchema,
          fileName: z
            .string()
            .trim()
            .min(1)
            .max(255)
            .refine((value) => !/[\\/]/.test(value), {
              message: "File name must not contain a path",
            }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const access = await requireApplicationAccess(ctx.user, input.applicationId);
        if (!access.canViewInternalNotes) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the assigned mentor or an administrator can attach reviewed documents",
          });
        }
        const result = await db.createDocument({
          applicationId: input.applicationId,
          documentType: input.documentType,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          uploadedBy: ctx.user.id,
        });
        return result;
      }),
  }),

  // ============================================================================
  // TUTOR ROUTES
  // ============================================================================
  tutor: router({
    // Get tutor profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const tutor = await db.getTutor(ctx.user.id);
      return tutor;
    }),

    // Create tutor profile
    createProfile: protectedProcedure
      .input(
        z.object({
          centerName: z.string(),
          location: z.string().optional(),
          expertiseAreas: z.string().optional(),
          referralCode: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.createTutor({
          userId: ctx.user.id,
          ...input,
        });
        return result;
      }),

    // Get referred students
    getReferredStudents: protectedProcedure.query(async ({ ctx }) => {
      const tutor = await db.getTutor(ctx.user.id);
      if (!tutor) return [];
      return await db.getReferralsByTutor(tutor.id);
    }),

    // Get commission summary
    getCommissionSummary: protectedProcedure.query(async ({ ctx }) => {
      const tutor = await db.getTutor(ctx.user.id);
      if (!tutor)
        return { totalReferred: 0, totalEarned: "0", pendingCommission: "0", availableForPayout: "0" };
      const pendingCommission = await db.getPendingCommissionByTutor(tutor.id);
      const earned = parseFloat(await db.getEarnedCommissionByTutor(tutor.id));
      const reserved = await db.getReservedPayoutTotalByTutor(tutor.id);
      return {
        totalReferred: tutor.totalReferred,
        totalEarned: tutor.totalEarned,
        pendingCommission,
        availableForPayout: Math.max(0, earned - reserved).toFixed(2),
      };
    }),

    // Request a commission payout via bKash/Nagad
    requestPayout: protectedProcedure
      .input(
        z.object({
          amount: z.number(),
          method: z.enum(["bKash", "Nagad"]),
          accountNumber: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tutor = await db.getTutor(ctx.user.id);
        if (!tutor) throw new Error("Tutor profile not found");
        // Format checks first (method, wallet number, minimum) against a
        // snapshot balance; the REAL balance check happens atomically below.
        const earned = parseFloat(await db.getEarnedCommissionByTutor(tutor.id));
        const reserved = await db.getReservedPayoutTotalByTutor(tutor.id);
        const check = validatePayoutRequest({
          amountBdt: input.amount,
          availableBdt: Math.max(0, earned - reserved),
          method: input.method,
          accountNumber: input.accountNumber,
        });
        if (!check.ok) throw new Error(check.error);
        // Balance reserve + insert in one transaction (tutor row locked), so
        // concurrent requests can never double-spend the same commission.
        const result = await db.createPayoutReserved(tutor.id, input.amount, input.method, check.accountNumber);
        if (!result.ok) {
          throw new Error(`Amount exceeds your available balance of \u09F3${result.available.toFixed(0)}.`);
        }
        const payoutId = result.payoutId;
        await db.createAuditLog({
          actorUserId: ctx.user.id,
          action: "payout.requested",
          entityType: "payout",
          entityId: payoutId,
          detail: JSON.stringify({ amount: input.amount, method: input.method }),
        });
        return { success: true, payoutId };
      }),

    // Payout history for the signed-in tutor
    getMyPayouts: protectedProcedure.query(async ({ ctx }) => {
      const tutor = await db.getTutor(ctx.user.id);
      if (!tutor) return [];
      return await db.getPayoutsByTutor(tutor.id);
    }),
  }),

  // ============================================================================
  // REFERRAL ROUTES
  // ============================================================================
  referral: router({
    // Create referral when student signs up with code
    createFromCode: protectedProcedure
      .input(z.object({ referralCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const student = await db.getStudent(ctx.user.id);
        if (!student) throw new Error("Student profile not found");
        const tutor = await db.getTutorByReferralCode(input.referralCode);
        if (!tutor) throw new Error("Invalid referral code");

        const result = await db.createReferral({
          tutorId: tutor.id,
          studentId: student.id,
          referralCode: input.referralCode,
          commissionPercentage: "5",
          commissionStatus: "pending",
        });
        return result;
      }),

    // Get referral by student and tutor
    getByStudentAndTutor: protectedProcedure
      .input(z.object({ studentId: z.number(), tutorId: z.number() }))
      .query(async ({ ctx, input }) => {
        const referral = await db.getReferralByStudentAndTutor(input.studentId, input.tutorId);
        if (!referral) return undefined;

        if (ctx.user.role === "admin") return referral;

        const [student, tutor] = await Promise.all([
          db.getStudent(ctx.user.id),
          db.getTutor(ctx.user.id),
        ]);
        const isStudent = student?.id === input.studentId;
        const isTutor = tutor?.id === input.tutorId;
        if (!isStudent && !isTutor) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this referral",
          });
        }

        if (isTutor) return referral;

        const {
          commissionPercentage: _commissionPercentage,
          commissionAmount: _commissionAmount,
          commissionStatus: _commissionStatus,
          payoutMethod: _payoutMethod,
          payoutDetails: _payoutDetails,
          ...studentSafeReferral
        } = referral;
        return studentSafeReferral;
      }),
  }),

  // ============================================================================
  // MENTOR ROUTES
  // ============================================================================
  mentor: router({
    // Get mentor profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const mentor = await db.getMentor(ctx.user.id);
      return mentor;
    }),

    // Create mentor profile
    createProfile: protectedProcedure
      .input(
        z.object({
          expertise: z.string().optional(),
          bio: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.createMentor({
          userId: ctx.user.id,
          expertise: input.expertise,
          bio: input.bio,
          verificationStatus: "pending",
        });
        return result;
      }),
  }),

  // ============================================================================
  // MESSAGE ROUTES
  // ============================================================================
  message: router({
    // Distinct people the user has a thread with (last message + unread count)
    getConversations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getConversationsForUser(ctx.user.id);
    }),

    // Get messages between two users
    getThread: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getMessagesBetween(ctx.user.id, input.otherUserId);
      }),

    // Send message
    send: protectedProcedure
      .input(
        z.object({
          recipientId: z.number(),
          content: z.string(),
          fileUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.createMessage({
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          content: input.content,
          fileUrl: input.fileUrl,
        });
        return result;
      }),

    // Mark message as read
    markAsRead: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markMessageAsRead(input.messageId, ctx.user.id);
        return { success: true };
      }),

    // Mark all incoming messages in one conversation as read
    markThreadAsRead: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markThreadAsRead(ctx.user.id, input.otherUserId);
        return { success: true };
      }),
  }),

  // ============================================================================
  // COHORT ROUTES
  // ============================================================================
  cohort: router({
    // Get all cohorts
    getAll: publicProcedure.query(async () => {
      return await db.getAllCohorts();
    }),

    // Join cohort
    join: protectedProcedure
      .input(z.object({ cohortId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const student = await db.getStudent(ctx.user.id);
        if (!student) throw new Error("Student profile not found");
        const result = await db.addStudentToCohort(input.cohortId, student.id);
        return result;
      }),

    // Cohort detail (name, description, membership state)
    getById: protectedProcedure
      .input(z.object({ cohortId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cohort = await db.getCohortById(input.cohortId);
        if (!cohort) throw new Error("Cohort not found");
        const student = await db.getStudent(ctx.user.id);
        const isMember = student ? await db.isCohortMember(input.cohortId, student.id) : false;
        const members = await db.getCohortMembers(input.cohortId);
        return { ...cohort, isMember, memberCount: members.length, members };
      }),

    // Discussion feed — members only
    getMessages: protectedProcedure
      .input(z.object({ cohortId: z.number() }))
      .query(async ({ ctx, input }) => {
        const student = await db.getStudent(ctx.user.id);
        if (!student) throw new Error("Student profile not found");
        if (!(await db.isCohortMember(input.cohortId, student.id))) {
          throw new Error("Join this cohort to see the discussion");
        }
        return await db.getCohortMessages(input.cohortId);
      }),

    // Post to the discussion — members only
    postMessage: protectedProcedure
      .input(z.object({ cohortId: z.number(), content: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const student = await db.getStudent(ctx.user.id);
        if (!student) throw new Error("Student profile not found");
        if (!(await db.isCohortMember(input.cohortId, student.id))) {
          throw new Error("Join this cohort to post");
        }
        const id = await db.createCohortMessage({
          cohortId: input.cohortId,
          studentId: student.id,
          content: input.content.trim(),
        });
        return { success: true, id };
      }),
  }),

  // ============================================================================
  // UNIVERSITY ROUTES
  // ============================================================================
  university: router({
    // Discovery directory only. Time-sensitive fees, entry rules, rankings,
    // visa claims, and processing times are intentionally not exposed.
    getAll: publicProcedure.query(() => universityDirectory),
  }),

  // ============================================================================
  // SKILL ROUTES
  // ============================================================================
  skill: router({
    // Get all skills
    getAll: publicProcedure.query(async () => {
      return await db.getAllSkills();
    }),

    // Get skills by category
    getByCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await db.getSkillsByCategory(input.category);
      }),
  }),

  // ============================================================================
  // NOTIFICATION ROUTES
  // ============================================================================
  notification: router({
    // Get notifications for user
    getForUser: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNotificationsByUser(ctx.user.id);
    }),

    // Mark notification as read
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationAsRead(input.notificationId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================
  admin: router({
    // Update application status (admin only)
    updateApplicationStatus: adminProcedure
      .input(
        z.object({
          applicationId: z.number(),
          status: applicationStatusSchema,
          notes: z.string().trim().max(5000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const before = await db.getApplication(input.applicationId);
        await db.updateApplicationStatus(
          input.applicationId,
          input.status,
          ctx.user.id,
          input.notes,
        );
        await db.createAuditLog({
          actorUserId: ctx.user.id,
          action: "application.status_change",
          entityType: "application",
          entityId: input.applicationId,
          detail: JSON.stringify({ from: before?.applicationStatus, to: input.status, notes: input.notes }),
        });
        const app = await db.getApplication(input.applicationId);
        if (app) {
          const student = await db.getStudentById(app.studentId);
          if (student) {
            await db.createNotification({
              userId: student.userId,
              type: "status_update",
              title: "Application Status Updated",
              message: `Your application to ${app.universityName} has moved to: ${input.status.replace(/_/g, " ")}`,
              relatedEntityId: input.applicationId,
            });
          }
        }
        return { success: true };
      }),

    // Get all applications (admin only)
    getAllApplications: adminProcedure.query(async () => {
      return await db.getAllApplications();
    }),

    // Get all students (admin only)
    getAllStudents: adminProcedure.query(async () => {
      return await db.getAllStudents();
    }),

    // Get all tutors (admin only)
    getAllTutors: adminProcedure.query(async () => {
      return await db.getAllTutors();
    }),

    // Get all mentors (admin only)
    getAllMentors: adminProcedure.query(async () => {
      return await db.getAllMentors();
    }),

    // Assign mentor to application (admin only)
    assignMentor: adminProcedure
      .input(z.object({ applicationId: z.number(), mentorUserId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateApplicationMentor(input.applicationId, input.mentorUserId);
        return { success: true };
      }),

    // Update tutor commission status (admin only)
    updateCommissionStatus: adminProcedure
      .input(z.object({ referralId: z.number(), status: z.string(), amount: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateReferralCommission(input.referralId, input.amount || "0", input.status);
        await db.createAuditLog({
          actorUserId: ctx.user.id,
          action: "referral.commission_change",
          entityType: "referral",
          entityId: input.referralId,
          detail: JSON.stringify({ to: input.status, amount: input.amount }),
        });
        return { success: true };
      }),

    // List payout requests (admin only)
    listPayouts: adminProcedure.query(async () => {
      return await db.getAllPayouts();
    }),

    // Approve / reject / mark-paid a payout (admin only)
    updatePayoutStatus: adminProcedure
      .input(
        z.object({
          payoutId: z.number(),
          status: z.enum(["approved", "rejected", "paid"]),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const payout = await db.getPayoutById(input.payoutId);
        if (!payout) throw new Error("Payout not found");
        if (!canTransitionPayout(payout.status, input.status)) {
          throw new Error(`Cannot move a ${payout.status} payout to ${input.status}.`);
        }
        await db.updatePayoutStatus(input.payoutId, input.status, input.note);
        await db.createAuditLog({
          actorUserId: ctx.user.id,
          action: `payout.${input.status}`,
          entityType: "payout",
          entityId: input.payoutId,
          detail: JSON.stringify({ from: payout.status, to: input.status, note: input.note }),
        });
        const tutor = await db.getTutorById(payout.tutorId);
        if (tutor) {
          const titles = {
            approved: "Payout approved",
            rejected: "Payout rejected",
            paid: "Payout sent",
          } as const;
          const messages = {
            approved: `Your ৳${parseFloat(payout.amount).toFixed(0)} payout was approved and will be sent to your ${payout.method} number shortly.`,
            rejected: `Your ৳${parseFloat(payout.amount).toFixed(0)} payout request was declined.${input.note ? ` Reason: ${input.note}` : ""}`,
            paid: `৳${parseFloat(payout.amount).toFixed(0)} has been sent to your ${payout.method} number ${payout.accountNumber}.`,
          } as const;
          await db.createNotification({
            userId: tutor.userId,
            type: "payout_update",
            title: titles[input.status],
            message: messages[input.status],
            relatedEntityId: input.payoutId,
          });
        }
        return { success: true };
      }),

    // Aggregated system analytics (admin only)
    getAnalytics: adminProcedure.query(async () => {
      return await db.getAdminAnalytics();
    }),

    // Audit trail (admin only)
    getAuditLogs: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAuditLogs(input?.limit ?? 100);
      }),

    // Create skill (admin only)
    createSkill: adminProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          category: z.string(),
          difficulty: z.enum(["beginner", "intermediate", "advanced"]),
          duration: z.string().optional(),
          content: z.string(),
          videoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.createSkill(input);
        return result;
      }),
  }),

  // ============================================================================
  // AI GUIDANCE ROUTES
  // ============================================================================
  aiGuidance: router({
    // Persistent chat — saves every message to DB, injects memories into each prompt.
    // Three real personas (Sayem/Fahim/Erfan), one grounded backend — see AI_GUIDES below.
    chat: protectedProcedure
      .input(
        z.object({
          message: z.string().trim().min(1).max(2000),
          guide: z.enum(["sayem", "fahim", "erfan"]).default("sayem"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");

        const student = await requireStudentProfile(ctx.user.id);
        const studentId = student.id;

        // Memory is shared across all three guides — one student file, three voices onto it.
        const [chatHistory, memories] = await Promise.all([
          db.getAIChatHistory(studentId, input.guide, 20),
          db.getAIMemories(studentId),
        ]);

        const memorySummary = memories.length > 0
          ? `\nWhat the team remembers about this student:\n${memories.map((m) => `- ${m.memoryKey}: ${m.memoryValue}`).join("\n")}`
          : "";

        const universityKnowledge = JSON.stringify(universityDirectory, null, 2);
        const persona = AI_GUIDES[input.guide];
        const systemPrompt = `${persona.systemPrompt}

Student Profile:
- Class: ${student.class || "Not specified"}
- GPA: ${student.gpa || "Not specified"}
- Field of Interest: ${student.fieldOfInterest || "Not specified"}
- Destination Preference: ${student.destinationPreference || "Not specified"}
${memorySummary}

MALAYSIA UNIVERSITY DISCOVERY DIRECTORY:
${universityKnowledge}

STRICT RULES (apply no matter which advisor you are):
1. Use the directory only to orient the student to names, locations, and broad study areas
2. Never invent or present current acceptance rates, fees, visa statistics, GPA requirements, rankings, scholarships, or processing times
3. Never invent specific community events, threads, or other students' stories you don't have real data for
4. Tell students to verify current programme and entry details on official university and government sources before applying
5. If a student seems distressed or borderline eligible, add: "I recommend speaking with one of our mentors to verify this before applying."
6. Clearly name which university you are discussing

After each response, if you learned something important about this student (a goal, concern, preferred university, timeline), output it on a NEW LINE in this exact format:
MEMORY::key::value
Example: MEMORY::target_university::Universiti Malaya
Only emit MEMORY lines for genuinely new, important facts — not for every message.`;

        // Save the user's message to DB
        await db.saveAIChatMessage({ studentId, guide: input.guide, role: "user", content: input.message });

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...chatHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: input.message },
        ];

        try {
          const { withSelfHealing } = await import("./self-healing");
          const result = await withSelfHealing(
            "llm:aiGuidance.chat",
            () => invokeLLM({ messages, model: ENV.aiGuidanceModel, maxTokens: 1024 }),
            { maxRetries: 2 },
          );
          const rawContent = result.choices[0]?.message?.content;
          let assistantMessage =
            typeof rawContent === "string" && rawContent.length > 0
              ? rawContent
              : "I couldn't generate a response. Please try again.";

          // Extract and persist MEMORY:: lines, strip them from the displayed response
          const memoryLines = assistantMessage.match(/^MEMORY::(.+)::(.+)$/gm) || [];
          for (const line of memoryLines) {
            const parts = line.replace("MEMORY::", "").split("::");
            if (parts.length === 2) {
              await db.upsertAIMemory(studentId, parts[0].trim(), parts[1].trim());
            }
          }
          assistantMessage = assistantMessage.replace(/^MEMORY::.+$/gm, "").trim();

          // Save AI response to DB
          await db.saveAIChatMessage({ studentId, guide: input.guide, role: "assistant", content: assistantMessage });

          return { success: true, message: assistantMessage, conversationId: ctx.user.id };
        } catch (error) {
          console.error("AI guidance error:", error);
          throw new Error("Failed to get AI guidance. Please try again.");
        }
      }),

    // Return persistent chat history for the current student with one guide
    getChatHistory: protectedProcedure
      .input(z.object({ guide: z.enum(["sayem", "fahim", "erfan"]).default("sayem") }))
      .query(async ({ ctx, input }) => {
        const student = await db.getStudent(ctx.user.id);
        if (!student) return [];
        return await db.getAIChatHistory(student.id, input.guide, 50);
      }),

    // Get university recommendations
    getRecommendations: protectedProcedure.query(async ({ ctx }) => {
      const { invokeLLM } = await import("./_core/llm");
      
      // Get student profile
      const student = await requireStudentProfile(ctx.user.id);
      
      const universityKnowledge = JSON.stringify(universityDirectory, null, 2);
      const prompt = `Based on this student profile, suggest 3-5 universities to research from the discovery directory.

Student Profile:
- Class: ${student.class}
- GPA/result: ${student.gpa} (as entered by the student; the scale may vary)
- Field of Interest: ${student.fieldOfInterest}
- Destination Preference: ${student.destinationPreference}

MALAYSIA UNIVERSITY DISCOVERY DIRECTORY:
${universityKnowledge}

Instructions:
- Only suggest universities from the directory above
- Match programs to the student's field of interest
- Do not claim the student is eligible; current entry requirements must be verified with the university
- Do not provide fees, visa odds, rankings, scholarships, acceptance rates, or processing times
- Explain that the list is a research starting point, not an admission or visa prediction

Return a JSON object with key "recommendations" containing an array where each item has:
- universityName (string)
- programName (string)
- whyGoodFit (string, 2-3 sentences, including what the student should verify next)`;
      
      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: ENV.aiGuidanceModel,
          maxTokens: 2048,
          responseFormat: { type: "json_object" },
        });
        
        const messageContent = result.choices[0]?.message?.content;
        if (!messageContent) throw new Error("No recommendations generated");
        
        // Handle both string and array content types
        const contentStr = typeof messageContent === "string" ? messageContent : JSON.stringify(messageContent);
        const recommendations = JSON.parse(contentStr);
        return recommendations;
      } catch (error) {
        console.error("Recommendation error:", error);
        throw new Error("Failed to generate recommendations. Please try again.");
      }
    }),
  }),

  // Privacy-bounded diagnostics: errors are redacted before storage, only
  // deterministic transient retries run automatically, and AI fixes stay
  // advisory. Diagnostic data and actions are admin-only.
  selfHealing: router({
    health: adminProcedure.query(async () => {
      const { getHealthSnapshot } = await import("./self-healing");
      return getHealthSnapshot();
    }),

    errors: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ input }) => {
        const { listErrorLogs } = await import("./self-healing");
        return listErrorLogs(input?.limit ?? 50);
      }),

    fixes: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ input }) => {
        const { listFixes } = await import("./self-healing");
        return listFixes(input?.limit ?? 50);
      }),

    diagnose: adminProcedure
      .input(z.object({ signature: z.string() }))
      .mutation(async ({ input }) => {
        const { diagnoseSignature } = await import("./self-healing");
        const fix = await diagnoseSignature(input.signature);
        return { success: !!fix, fix };
      }),

    ignore: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { ignoreError } = await import("./self-healing");
        await ignoreError(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
