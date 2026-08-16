import { describe, expect, it } from "vitest";
import {
  COMMISSION_PER_STUDENT_BDT,
  canTransitionCommission,
  commissionForReferral,
  commissionForStudents,
  formatBdt,
  generateReferralCode,
  normalizeReferralCode,
  REFERRAL_CODE_REGEX,
} from "../shared/commission";

describe("commission amounts", () => {
  it("pays a flat 35,000 BDT per referred student", () => {
    expect(COMMISSION_PER_STUDENT_BDT).toBe(35000);
    expect(commissionForReferral()).toBe(35000);
  });

  it("multiplies by student count", () => {
    expect(commissionForStudents(1)).toBe(35000);
    expect(commissionForStudents(10)).toBe(350000);
  });

  it("never returns negative or fractional commission", () => {
    expect(commissionForStudents(0)).toBe(0);
    expect(commissionForStudents(-3)).toBe(0);
    expect(commissionForStudents(2.7)).toBe(70000);
    expect(commissionForStudents(Number.NaN)).toBe(0);
  });
});

describe("commission status transitions", () => {
  it("moves forward through the lifecycle", () => {
    expect(canTransitionCommission("pending", "earned")).toBe(true);
    expect(canTransitionCommission("earned", "paid")).toBe(true);
  });

  it("refuses to skip stages or resurrect settled commission", () => {
    expect(canTransitionCommission("pending", "paid")).toBe(false);
    expect(canTransitionCommission("paid", "earned")).toBe(false);
    expect(canTransitionCommission("earned", "pending")).toBe(false);
    expect(canTransitionCommission("paid", "pending")).toBe(false);
  });

  it("rejects unknown statuses instead of throwing", () => {
    expect(canTransitionCommission("bogus", "earned")).toBe(false);
    expect(canTransitionCommission("pending", "bogus")).toBe(false);
  });
});

describe("formatBdt", () => {
  it("formats whole taka with separators", () => {
    expect(formatBdt(35000)).toBe("৳35,000");
    expect(formatBdt("350000")).toBe("৳350,000");
    expect(formatBdt(0)).toBe("৳0");
  });

  it("degrades to zero on garbage rather than printing NaN to a tutor", () => {
    expect(formatBdt("not-a-number")).toBe("৳0");
    expect(formatBdt(Number.NaN)).toBe("৳0");
  });
});

describe("generateReferralCode", () => {
  it("produces codes matching the documented format", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateReferralCode()).toMatch(REFERRAL_CODE_REGEX);
    }
  });

  it("is deterministic under an injected generator", () => {
    expect(generateReferralCode(() => 0)).toBe("LB-AAAAA");
  });

  it("excludes characters that are ambiguous when read aloud", () => {
    const codes = Array.from({ length: 400 }, () => generateReferralCode()).join("");
    for (const ambiguous of ["0", "O", "1", "I", "L".repeat(1)]) {
      // "L" appears only in the LB- prefix, never in the random body.
      const body = codes.replace(/LB-/g, "");
      expect(body).not.toContain(ambiguous === "L" ? "L" : ambiguous);
    }
  });
});

describe("normalizeReferralCode", () => {
  it("accepts the canonical form", () => {
    expect(normalizeReferralCode("LB-ABCDE")).toBe("LB-ABCDE");
  });

  it("tolerates how students actually type codes", () => {
    expect(normalizeReferralCode("lb-abcde")).toBe("LB-ABCDE");
    expect(normalizeReferralCode("  LB-ABCDE  ")).toBe("LB-ABCDE");
    expect(normalizeReferralCode("LBABCDE")).toBe("LB-ABCDE");
    expect(normalizeReferralCode("ABCDE")).toBe("LB-ABCDE");
    expect(normalizeReferralCode("abcde")).toBe("LB-ABCDE");
  });

  it("rejects malformed codes instead of inventing one", () => {
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode("   ")).toBeNull();
    expect(normalizeReferralCode("LB-ABC")).toBeNull();
    expect(normalizeReferralCode("LB-ABCDEF")).toBeNull();
    expect(normalizeReferralCode("LB-ABCD0")).toBeNull();
    expect(normalizeReferralCode("LB-ABCDO")).toBeNull();
  });
});
