import { describe, expect, it } from "vitest";
import {
  MIN_PAYOUT_BDT,
  canTransitionPayout,
  normalizeBdWalletNumber,
  validatePayoutRequest,
} from "../shared/payout";

describe("normalizeBdWalletNumber", () => {
  it("accepts a plain local number", () => {
    expect(normalizeBdWalletNumber("01712345678")).toBe("01712345678");
  });

  it("normalizes +880 and 880 prefixes to local form", () => {
    expect(normalizeBdWalletNumber("+8801712345678")).toBe("01712345678");
    expect(normalizeBdWalletNumber("8801712345678")).toBe("01712345678");
  });

  it("strips spaces and dashes", () => {
    expect(normalizeBdWalletNumber("017 1234-5678")).toBe("01712345678");
  });

  it("rejects invalid operator prefixes, lengths, and garbage", () => {
    expect(normalizeBdWalletNumber("01212345678")).toBeNull(); // 012 is not a BD operator
    expect(normalizeBdWalletNumber("0171234567")).toBeNull(); // too short
    expect(normalizeBdWalletNumber("017123456789")).toBeNull(); // too long
    expect(normalizeBdWalletNumber("hello")).toBeNull();
    expect(normalizeBdWalletNumber("")).toBeNull();
  });
});

describe("validatePayoutRequest", () => {
  const base = { availableBdt: 10000, method: "bKash", accountNumber: "01712345678" };

  it("accepts a valid request and returns the normalized number", () => {
    const r = validatePayoutRequest({ ...base, amountBdt: 5000, accountNumber: "+880 1712-345678" });
    expect(r).toEqual({ ok: true, accountNumber: "01712345678" });
  });

  it("rejects unknown methods", () => {
    const r = validatePayoutRequest({ ...base, amountBdt: 5000, method: "PayPal" });
    expect(r.ok).toBe(false);
  });

  it("rejects zero, negative, and non-finite amounts", () => {
    expect(validatePayoutRequest({ ...base, amountBdt: 0 }).ok).toBe(false);
    expect(validatePayoutRequest({ ...base, amountBdt: -50 }).ok).toBe(false);
    expect(validatePayoutRequest({ ...base, amountBdt: NaN }).ok).toBe(false);
  });

  it("enforces the minimum payout", () => {
    expect(validatePayoutRequest({ ...base, amountBdt: MIN_PAYOUT_BDT - 1 }).ok).toBe(false);
    expect(validatePayoutRequest({ ...base, amountBdt: MIN_PAYOUT_BDT }).ok).toBe(true);
  });

  it("rejects amounts above the available balance", () => {
    const r = validatePayoutRequest({ ...base, amountBdt: 10001 });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid wallet numbers", () => {
    const r = validatePayoutRequest({ ...base, amountBdt: 5000, accountNumber: "12345" });
    expect(r.ok).toBe(false);
  });
});

describe("canTransitionPayout", () => {
  it("follows the requested → approved → paid lifecycle", () => {
    expect(canTransitionPayout("requested", "approved")).toBe(true);
    expect(canTransitionPayout("requested", "rejected")).toBe(true);
    expect(canTransitionPayout("approved", "paid")).toBe(true);
    expect(canTransitionPayout("approved", "rejected")).toBe(true);
  });

  it("blocks skipping approval and reopening settled payouts", () => {
    expect(canTransitionPayout("requested", "paid")).toBe(false);
    expect(canTransitionPayout("paid", "approved")).toBe(false);
    expect(canTransitionPayout("paid", "rejected")).toBe(false);
    expect(canTransitionPayout("rejected", "approved")).toBe(false);
    expect(canTransitionPayout("nonsense", "approved")).toBe(false);
  });
});
