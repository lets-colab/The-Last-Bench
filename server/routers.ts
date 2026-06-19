import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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
        return result;
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
      .query(async ({ input }) => {
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
        // TODO: Verify user is mentor or admin for this application
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
      .query(async ({ input }) => {
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
      if (!tutor) return { totalReferred: 0, totalEarned: "0", pendingCommission: "0" };
      return {
        totalReferred: tutor.totalReferred,
        totalEarned: tutor.totalEarned,
        pendingCommission: "0", // TODO: Calculate from referrals table
      };
    }),
  }),

  // ============================================================================
  // REFERRAL ROUTES
  // ============================================================================
  referral: router({
    // Create referral when student signs up with code
    createFromCode: publicProcedure
      .input(z.object({ referralCode: z.string(), studentId: z.number() }))
      .mutation(async ({ input }) => {
        const tutor = await db.getTutorByReferralCode(input.referralCode);
        if (!tutor) throw new Error("Invalid referral code");

        const result = await db.createReferral({
          tutorId: tutor.id,
          studentId: input.studentId,
          referralCode: input.referralCode,
          commissionPercentage: "5",
          commissionStatus: "pending",
        });
        return result;
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
        await db.updateApplicationStatus(input.applicationId, input.status, ctx.user.id);
        // Create notification for student
        const app = await db.getApplication(input.applicationId);
        if (app) {
          await db.createNotification({
            userId: 0, // TODO: Get student user ID from student ID
            type: "status_update",
            title: "Application Status Updated",
            message: `Your application status has been updated to ${input.status}`,
            relatedEntityId: input.applicationId,
          });
        }
        return { success: true };
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
    // Chat with AI for university guidance
    chat: protectedProcedure
      .input(
        z.object({
          message: z.string(),
          conversationHistory: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        
        // Get student profile for context
        const student = await db.getStudent(ctx.user.id);
        
        // Build system prompt with student context
        const systemPrompt = `You are an expert study-abroad advisor for The Last Bench platform. You help Bangladeshi secondary school students explore university options and guide them through the application process.

Student Context:
- Class: ${student?.class || "Not specified"}
- GPA: ${student?.gpa || "Not specified"}
- Field of Interest: ${student?.fieldOfInterest || "Not specified"}
- Destination Preference: ${student?.destinationPreference || "Not specified"}

Your role is to:
1. Answer questions about universities, programs, and application processes
2. Provide personalized recommendations based on their profile
3. Explain visa requirements and success rates
4. Suggest next steps in their journey
5. Be encouraging and supportive

Always be honest about acceptance rates and visa requirements. If you don't know specific information, say so and suggest they verify with the university directly.`;
        
        // Build message history
        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...(input.conversationHistory || []).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          { role: "user" as const, content: input.message },
        ];
        
        try {
          const result = await invokeLLM({
            messages,
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 1024,
          });
          
          const assistantMessage = result.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
          
          return {
            success: true,
            message: assistantMessage,
            conversationId: ctx.user.id,
          };
        } catch (error) {
          console.error("AI guidance error:", error);
          throw new Error("Failed to get AI guidance. Please try again.");
        }
      }),

    // Get university recommendations
    getRecommendations: protectedProcedure.query(async ({ ctx }) => {
      const { invokeLLM } = await import("./_core/llm");
      
      // Get student profile
      const student = await db.getStudent(ctx.user.id);
      
      if (!student) {
        throw new Error("Student profile not found");
      }
      
      const prompt = `Based on this student profile, recommend 3-5 universities that would be a good fit:

Student Profile:
- Class: ${student.class}
- GPA: ${student.gpa}
- Field of Interest: ${student.fieldOfInterest}
- Destination Preference: ${student.destinationPreference}

For each recommendation, provide:
1. University name
2. Program name
3. Why it's a good fit (2-3 sentences)
4. Estimated cost range
5. Visa success rate estimate
6. Acceptance rate estimate

Format your response as JSON with an array of recommendations.`;
      
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
});

export type AppRouter = typeof appRouter;
