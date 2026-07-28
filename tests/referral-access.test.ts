import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

function createContext(id: number, role: "user" | "admin" | "tutor" = "user"): TrpcContext {
  return {
    user: {
      id,
      openId: `user-${id}`,
      email: null,
      name: "Member",
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

const referral = {
  id: 7,
  studentId: 11,
  tutorId: 22,
  referralCode: "LB-TEST",
  commissionPercentage: "5",
  commissionAmount: "1500",
  commissionStatus: "earned" as const,
  payoutMethod: "bKash",
  payoutDetails: '{"phone":"01700000000"}',
  createdAt: new Date(),
  updatedAt: new Date(),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("referral access control", () => {
  it("rejects a user who owns neither side of the referral", async () => {
    vi.spyOn(db, "getReferralByStudentAndTutor").mockResolvedValue(referral);
    vi.spyOn(db, "getStudent").mockResolvedValue({ id: 99 } as any);
    vi.spyOn(db, "getTutor").mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createContext(42));

    await expect(
      caller.referral.getByStudentAndTutor({ studentId: 11, tutorId: 22 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("redacts commission and payout data from the referred student", async () => {
    vi.spyOn(db, "getReferralByStudentAndTutor").mockResolvedValue(referral);
    vi.spyOn(db, "getStudent").mockResolvedValue({ id: 11 } as any);
    vi.spyOn(db, "getTutor").mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createContext(42));
    const result = await caller.referral.getByStudentAndTutor({
      studentId: 11,
      tutorId: 22,
    });

    expect(result).toMatchObject({
      id: 7,
      studentId: 11,
      tutorId: 22,
      referralCode: "LB-TEST",
    });
    expect(result).not.toHaveProperty("commissionAmount");
    expect(result).not.toHaveProperty("payoutDetails");
  });

  it("allows the owning tutor to read their referral record", async () => {
    vi.spyOn(db, "getReferralByStudentAndTutor").mockResolvedValue(referral);
    vi.spyOn(db, "getStudent").mockResolvedValue(undefined);
    vi.spyOn(db, "getTutor").mockResolvedValue({ id: 22 } as any);

    const caller = appRouter.createCaller(createContext(42, "tutor"));
    const result = await caller.referral.getByStudentAndTutor({
      studentId: 11,
      tutorId: 22,
    });

    expect(result).toEqual(referral);
  });
});
