import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

function createStudentContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "student-42",
      email: null,
      name: "Student",
      loginMethod: "manus",
      role,
      expoPushToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("student application privacy", () => {
  it("does not expose internal notes or unsourced admissions claims", async () => {
    vi.spyOn(db, "getStudent").mockResolvedValue({ id: 11 } as any);
    vi.spyOn(db, "getApplicationsByStudent").mockResolvedValue([
      {
        id: 7,
        studentId: 11,
        universityName: "Example University",
        programName: "Computer Science",
        country: "Malaysia",
        applicationStatus: "draft",
        estimatedCost: "RM 50,000",
        visaSuccessRate: "99%",
        acceptanceRate: "88%",
        mentorAssigned: null,
        lastUpdatedBy: null,
        lastUpdatedAt: new Date(),
        notes: "Internal review note",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(createStudentContext());
    const [application] = await caller.application.getByStudent();

    expect(application).toMatchObject({
      id: 7,
      universityName: "Example University",
      programName: "Computer Science",
    });
    expect(application).not.toHaveProperty("notes");
    expect(application).not.toHaveProperty("estimatedCost");
    expect(application).not.toHaveProperty("visaSuccessRate");
    expect(application).not.toHaveProperty("acceptanceRate");
  });

  it("does not let a student register an arbitrary document link", async () => {
    vi.spyOn(db, "getApplication").mockResolvedValue({
      id: 7,
      studentId: 11,
      mentorAssigned: null,
    } as any);
    vi.spyOn(db, "getStudent").mockResolvedValue({ id: 11 } as any);
    const createDocument = vi.spyOn(db, "createDocument");

    const caller = appRouter.createCaller(createStudentContext());

    await expect(
      caller.document.upload({
        applicationId: 7,
        documentType: "transcript",
        fileUrl: "https://files.example.test/transcript.pdf",
        fileName: "transcript.pdf",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("requires reviewed document links to use HTTPS", async () => {
    const getApplication = vi.spyOn(db, "getApplication");
    const caller = appRouter.createCaller(createStudentContext("admin"));

    await expect(
      caller.document.upload({
        applicationId: 7,
        documentType: "transcript",
        fileUrl: "http://files.example.test/transcript.pdf",
        fileName: "transcript.pdf",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getApplication).not.toHaveBeenCalled();
  });
});
