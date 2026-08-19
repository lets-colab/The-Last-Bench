import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { canTransitionPayout, validatePayoutRequest } from "../shared/payout";
import { COMMISSION_PER_STUDENT_BDT, normalizeReferralCode } from "../shared/commission";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const malaysiaUniversities = require("./data/malaysia-universities.json") as Array<Record<string, unknown>>;

// The three founder-trained AI advisors. Real people, real specialties — each
// persona is grounded on the same verified data and shares the student's
// memory file, so switching guides never loses context.
const AI_GUIDES = {
  sayem: {
    name: "Sayem Ahmed",
    systemPrompt: `You are Sayem's AI — trained by Sayem Ahmed, CEO and co-founder of Last Bench.
Sayem runs the whole student journey: you are the main advisor, focused on the student's
application pipeline, document tracker, and overall status. Speak like a founder who is
personally invested in this student succeeding — direct, warm, practical. When a student asks
something outside your lane (deep university comparisons, community connections), answer what
you can from the shared student file, then suggest they also ask Fahim's AI (career/university
matching) or Erfan's AI (community) by name.`,
  },
  fahim: {
    name: "Fahim Shahbaz",
    systemPrompt: `You are Fahim's AI — trained by Fahim Shahbaz, the career guide at Last Bench.
Fahim's expertise is matching students to the right university and program: comparing costs,
visa success rates, GPA fit, and career outcomes. Speak like a sharp, honest career counselor —
give real tradeoffs, not just cheerleading. Defer to Sayem's AI for tracker/document status
questions, and to Erfan's AI for community questions.`,
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
          class: z.string().optional(),
          fieldOfInterest: z.string().optional(),
          destinationPreference: z.string().optional(),
          gpa: z.string().optional(),
          referralCode: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.createStudent({
          userId: ctx.user.id,
          ...input,
        });

        // Attribute the referral so the tutor is actually credited. Previously
        // the code was stored on the student row and nothing else happened, so
        // no tutor ever earned anything.
        let referral: { attributed: boolean; reason?: string } = { attributed: false };
        if (input.referralCode) {
          const student = await db.getStudent(ctx.user.id);
          if (student) {
            const outcome = await db.createReferralFromCode({
              studentId: student.id,
              rawCode: input.referralCode,
            });
            referral = outcome.ok ? { attributed: true } : { attributed: false, reason: outcome.reason };
          }
        }

        // A bad code must not fail signup — the student still gets an account,
        // and the caller can surface `referral.reason` to let them retry.
        return { ...result, referral };
      }),

    // Update student profile
    updateProfile: protectedProcedure
      .input(
        z.object({
          class: z.string().optional(),
          fieldOfInterest: z.string().optional(),
          destinationPreference: z.string().optional(),
          gpa: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateStudent(ctx.user.id, input);
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
      return await db.getApplicationsByStudent(student.id);
    }),

    // Get single application
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        // Same unchecked-id exposure as the document routes had: this is what
        // application-detail.tsx calls, so without the check any authenticated
        // user could read any student's application by guessing an id.
        if (!(await db.canAccessApplication(ctx.user, input.id))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this application." });
        }
        return await db.getApplication(input.id);
      }),

    // Create application
    create: protectedProcedure
      .input(
        z.object({
          universityName: z.string(),
          programName: z.string(),
          country: z.string().optional(),
          estimatedCost: z.string().optional(),
          visaSuccessRate: z.string().optional(),
          acceptanceRate: z.string().optional(),
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
          status: z.string(),
          notes: z.string().optional(),
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
        await db.updateApplicationStatus(input.applicationId, input.status, ctx.user.id);
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
        // applicationId comes straight from the client. Without this check any
        // authenticated user could read any student's documents by incrementing
        // an integer.
        if (!(await db.canAccessApplication(ctx.user, input.applicationId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this application." });
        }
        return await db.getDocumentsByApplication(input.applicationId);
      }),

    // Upload document
    upload: protectedProcedure
      .input(
        z.object({
          applicationId: z.number(),
          documentType: z.string(),
          fileUrl: z.string(),
          fileName: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Same exposure on the write side: unchecked, anyone could attach a
        // document to anyone else's application.
        if (!(await db.canAccessApplication(ctx.user, input.applicationId))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this application." });
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
          centerName: z.string().min(1),
          location: z.string().optional(),
          expertiseAreas: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // The referral code is issued by the server, not chosen by the client.
        // Client-supplied codes collided against the unique index and surfaced
        // a raw Postgres error to the tutor.
        const referralCode = await db.allocateReferralCode();
        await db.createTutor({
          userId: ctx.user.id,
          ...input,
          referralCode,
        });
        return { referralCode };
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
      const referrals = await db.getReferralsByTutor(tutor.id);
      return {
        // Derived from the ledger, not from the cached columns on `tutors` —
        // those used to read a stale "0" next to correct computed values.
        totalReferred: referrals.length,
        totalEarned: earned.toFixed(2),
        pendingCommission,
        availableForPayout: Math.max(0, earned - reserved).toFixed(2),
        commissionPerStudent: COMMISSION_PER_STUDENT_BDT,
        referralCode: tutor.referralCode,
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

        const outcome = await db.createReferralFromCode({
          studentId: student.id,
          rawCode: input.referralCode,
        });
        if (!outcome.ok) {
          throw new Error(
            outcome.reason === "invalid_format"
              ? "That referral code isn't in the right format (it looks like LB-XXXXX)."
              : outcome.reason === "self_referral"
                ? "You can't use your own referral code."
                : "We couldn't find that referral code."
          );
        }
        return { attributed: true, created: outcome.created, referral: outcome.referral };
      }),

    /**
     * Check a code before signup so the student sees who referred them instead
     * of discovering a typo after their account exists. Read-only: it reveals
     * only the centre name, never the tutor's identity or earnings.
     */
    checkCode: publicProcedure
      .input(z.object({ referralCode: z.string() }))
      .query(async ({ input }) => {
        const code = normalizeReferralCode(input.referralCode);
        if (!code) return { valid: false as const, reason: "invalid_format" as const };
        const tutor = await db.getTutorByReferralCode(code);
        if (!tutor || tutor.status !== "active") {
          return { valid: false as const, reason: "unknown_code" as const };
        }
        return { valid: true as const, code, centerName: tutor.centerName };
      }),

    // Get referral by student and tutor
    getByStudentAndTutor: protectedProcedure
      .input(z.object({ studentId: z.number(), tutorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getReferralByStudentAndTutor(input.studentId, input.tutorId);
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
      .mutation(async ({ input }) => {
        await db.markMessageAsRead(input.messageId);
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
    // Verified Malaysia university database (same data the AI advisor cites)
    getAll: publicProcedure.query(() => malaysiaUniversities),
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
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.notificationId);
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
          status: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const before = await db.getApplication(input.applicationId);
        await db.updateApplicationStatus(input.applicationId, input.status, ctx.user.id);
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
      .input(
        z.object({
          referralId: z.number(),
          status: z.enum(["pending", "earned", "paid"]),
          // Omit to keep the flat per-student rate. Only pass this to override.
          amount: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateReferralCommission(input.referralId, input.amount, input.status);
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
      .input(z.object({ message: z.string(), guide: z.enum(["sayem", "fahim", "erfan"]).default("sayem") }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");

        const student = await db.getStudent(ctx.user.id);
        const studentId = student?.id ?? 0;

        // Memory is shared across all three guides — one student file, three voices onto it.
        const [chatHistory, memories] = await Promise.all([
          db.getAIChatHistory(studentId, input.guide, 20),
          db.getAIMemories(studentId),
        ]);

        const memorySummary = memories.length > 0
          ? `\nWhat the team remembers about this student:\n${memories.map((m) => `- ${m.memoryKey}: ${m.memoryValue}`).join("\n")}`
          : "";

        const universityKnowledge = JSON.stringify(malaysiaUniversities, null, 2);
        const persona = AI_GUIDES[input.guide];
        const systemPrompt = `${persona.systemPrompt}

Student Profile:
- Class: ${student?.class || "Not specified"}
- GPA: ${student?.gpa || "Not specified"}
- Field of Interest: ${student?.fieldOfInterest || "Not specified"}
- Destination Preference: ${student?.destinationPreference || "Not specified"}
${memorySummary}

VERIFIED MALAYSIA UNIVERSITY DATABASE (ONLY cite from this list):
${universityKnowledge}

STRICT RULES (apply no matter which advisor you are):
1. Only recommend universities from the verified database above
2. Never invent acceptance rates, costs, visa statistics, or GPA requirements not in the data
3. Never invent specific community events, threads, or other students' stories you don't have real data for
4. If asked about universities NOT in the database, say you don't have verified data
5. If a student seems distressed or borderline eligible, add: "I recommend speaking with one of our mentors to verify this before applying."
6. Always cite which university you are referencing
7. GPA scale is 5.0; convert 4.0-scale scores by multiplying by 1.25

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
            () => invokeLLM({ messages, model: "claude-3-5-sonnet-20241022", maxTokens: 1024 }),
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
      const student = await db.getStudent(ctx.user.id);
      
      if (!student) {
        throw new Error("Student profile not found");
      }
      
      const universityKnowledge = JSON.stringify(malaysiaUniversities, null, 2);
      const prompt = `Based on this student profile, recommend 3-5 universities from the VERIFIED DATABASE ONLY.

Student Profile:
- Class: ${student.class}
- GPA: ${student.gpa} (on 5.0 scale)
- Field of Interest: ${student.fieldOfInterest}
- Destination Preference: ${student.destinationPreference}

VERIFIED MALAYSIA UNIVERSITY DATABASE:
${universityKnowledge}

Instructions:
- Only recommend universities from the database above
- Match programs to the student's field of interest
- Only recommend universities where the student's GPA meets the minimum requirement
- Use exact cost and visa data from the database

Return a JSON object with key "recommendations" containing an array where each item has:
- universityName (string)
- programName (string)
- whyGoodFit (string, 2-3 sentences)
- estimatedCostUSD (string, e.g. "$9,500/year")
- visaSuccessRate (string, from database)
- gpaRequired (string, from database)
- emgsCategory (string, from database)`;
      
      try {
        const result = await invokeLLM({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "claude-3-5-sonnet-20241022",
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

  // Self-healing engine: the system logs every error, auto-recovers where
  // safe, and learns from each fix. Admin can inspect what it has learned.
  selfHealing: router({
    health: publicProcedure.query(async () => {
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
