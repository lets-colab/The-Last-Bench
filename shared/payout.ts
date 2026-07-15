/**
 * Payout domain rules, shared by server validation and client UX.
 * Pure functions only — unit tested in tests/payout.test.ts.
 */

export const PAYOUT_METHODS = ["bKash", "Nagad"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const MIN_PAYOUT_BDT = 500;

/**
 * Normalize a Bangladeshi mobile wallet number to local `01XXXXXXXXX` form.
 * Accepts `+8801…`, `8801…`, and `01…` inputs with spaces or dashes.
 * Returns null when the number is not a valid BD mobile number.
 */
export function normalizeBdWalletNumber(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+/, "");
  const local = digits.startsWith("880") ? "0" + digits.slice(3) : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

export type PayoutValidation = { ok: true; accountNumber: string } | { ok: false; error: string };

/**
 * Validate a payout request against the tutor's available balance.
 * `availableBdt` should be earned commission minus payouts already in flight.
 */
export function validatePayoutRequest(input: {
  amountBdt: number;
  availableBdt: number;
  method: string;
  accountNumber: string;
}): PayoutValidation {
  if (!PAYOUT_METHODS.includes(input.method as PayoutMethod)) {
    return { ok: false, error: "Payout method must be bKash or Nagad." };
  }
  if (!Number.isFinite(input.amountBdt) || input.amountBdt <= 0) {
    return { ok: false, error: "Enter a payout amount greater than zero." };
  }
  if (input.amountBdt < MIN_PAYOUT_BDT) {
    return { ok: false, error: `Minimum payout is ৳${MIN_PAYOUT_BDT}.` };
  }
  if (input.amountBdt > input.availableBdt) {
    return {
      ok: false,
      error: `Amount exceeds your available balance of ৳${input.availableBdt.toFixed(0)}.`,
    };
  }
  const accountNumber = normalizeBdWalletNumber(input.accountNumber);
  if (!accountNumber) {
    return { ok: false, error: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)." };
  }
  return { ok: true, accountNumber };
}

/** Allowed payout status transitions, enforced server-side. */
export const PAYOUT_TRANSITIONS: Record<string, readonly string[]> = {
  requested: ["approved", "rejected"],
  approved: ["paid", "rejected"],
  rejected: [],
  paid: [],
};

export function canTransitionPayout(from: string, to: string): boolean {
  return (PAYOUT_TRANSITIONS[from] ?? []).includes(to);
}
