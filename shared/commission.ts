/**
 * Referral commission domain rules.
 *
 * Pure functions only — no I/O, no DB. Unit tested in tests/commission.test.ts.
 * The server is the only place allowed to write commission amounts; the client
 * imports these helpers purely to render the same numbers the server computed.
 *
 * MODEL: flat amount per successfully referred student. NOT a percentage of a
 * fee. A tutor earns COMMISSION_PER_STUDENT_BDT for each referred student whose
 * commission an admin has marked "earned".
 */

/** Commission a tutor earns per referred student, in BDT. */
export const COMMISSION_PER_STUDENT_BDT = 35000;

/**
 * Commission lifecycle:
 *   pending — referral exists, not yet payable (default on signup)
 *   earned  — admin confirmed it; counts toward the tutor's available balance
 *   paid    — settled via a payout
 */
export const COMMISSION_STATUSES = ["pending", "earned", "paid"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

/**
 * Allowed commission status transitions, enforced server-side.
 * Mirrors the payout state machine in payout.ts: forward-only, no resurrection
 * of a settled commission.
 */
export const COMMISSION_TRANSITIONS: Record<CommissionStatus, readonly CommissionStatus[]> = {
  pending: ["earned"],
  earned: ["paid"],
  paid: [],
};

export function canTransitionCommission(from: string, to: string): boolean {
  return (COMMISSION_TRANSITIONS[from as CommissionStatus] ?? []).includes(to as CommissionStatus);
}

/** Commission owed for a single referred student. */
export function commissionForReferral(): number {
  return COMMISSION_PER_STUDENT_BDT;
}

/** Total commission for n referred students. */
export function commissionForStudents(studentCount: number): number {
  if (!Number.isFinite(studentCount) || studentCount <= 0) return 0;
  return Math.floor(studentCount) * COMMISSION_PER_STUDENT_BDT;
}

/**
 * Format a BDT amount for display. Whole taka only — commission is never
 * fractional under the flat model, and rounding money in the UI hides bugs.
 */
export function formatBdt(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "৳0";
  return "৳" + Math.round(n).toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Referral codes
// ---------------------------------------------------------------------------

/**
 * Alphabet excludes 0/O/1/I/L to survive being read aloud over the phone or
 * copied off a printed flyer, which is how these codes actually travel.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RANDOM_LEN = 5;

/** Referral codes are `LB-XXXXX`. Case-insensitive on input, upper on storage. */
export const REFERRAL_CODE_PREFIX = "LB";
export const REFERRAL_CODE_REGEX = /^LB-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;

/**
 * Generate a referral code. Server-side only — the caller must retry on unique
 * violation, since uniqueness is owned by the database, not by this function.
 *
 * `randomInt` is injectable so tests can assert the format deterministically.
 */
export function generateReferralCode(randomInt: (maxExclusive: number) => number = defaultRandomInt): string {
  let body = "";
  for (let i = 0; i < CODE_RANDOM_LEN; i++) {
    body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `${REFERRAL_CODE_PREFIX}-${body}`;
}

function defaultRandomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Normalize a user-entered referral code: trims, uppercases, tolerates a
 * missing hyphen and a missing prefix (students routinely type just the body).
 * Returns null when the result still isn't a valid code.
 */
export function normalizeReferralCode(raw: string): string | null {
  const cleaned = (raw ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (!cleaned) return null;
  const body = cleaned.startsWith(REFERRAL_CODE_PREFIX) ? cleaned.slice(REFERRAL_CODE_PREFIX.length) : cleaned;
  const candidate = `${REFERRAL_CODE_PREFIX}-${body}`;
  return REFERRAL_CODE_REGEX.test(candidate) ? candidate : null;
}
