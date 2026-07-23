// Deterministic university match scoring.
//
// The dashboard shows a "match %" per university (the design labels it
// "Fahim's match"). To honor the app's "never fake data" rule, this score is
// computed transparently from the student's real profile against the real
// university dataset — never random, never hardcoded. Same inputs always
// produce the same score, and every point is explainable via `reasons`.

export interface MatchStudent {
  gpa?: string | null; // 0–5 scale, stored as string
  fieldOfInterest?: string | null;
}

export interface MatchUniversity {
  programs?: string[];
  gpaRequirement?: { min?: string; typical?: string; outOf?: string };
  visaSuccessRateBD?: number | string;
}

export interface MatchResult {
  score: number; // 40–99
  reasons: string[];
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Score how well a university fits a student (40–99), with human-readable
 * reasons. Weighting: GPA fit (up to 25), field-of-interest fit (up to 20),
 * visa success rate (up to 5), on a base of 50. Missing profile data scores
 * neutrally rather than punishing the student.
 */
export function scoreUniversityMatch(student: MatchStudent, uni: MatchUniversity): MatchResult {
  let score = 50;
  const reasons: string[] = [];

  // --- GPA fit (max +25) ---
  const gpa = toNum(student.gpa);
  const minReq = toNum(uni.gpaRequirement?.min);
  if (gpa == null) {
    score += 12;
    reasons.push("Add your GPA for a sharper match");
  } else if (minReq == null) {
    score += 12;
  } else if (gpa >= minReq) {
    score += 25;
    reasons.push(`Your GPA ${gpa} clears the ${minReq} entry bar`);
  } else if (gpa >= minReq - 0.3) {
    score += 10;
    reasons.push(`Your GPA ${gpa} is close to the ${minReq} bar — a stretch`);
  } else {
    reasons.push(`GPA ${minReq} required; yours is ${gpa}`);
  }

  // --- Field of interest fit (max +20) ---
  const field = (student.fieldOfInterest || "").trim().toLowerCase();
  const programs = uni.programs || [];
  if (!field) {
    score += 10;
  } else {
    const hit = programs.find(
      (p) => p.toLowerCase().includes(field) || field.includes(p.toLowerCase())
    );
    if (hit) {
      score += 20;
      reasons.push(`Offers ${hit}, matching your interest`);
    } else {
      score += 5;
    }
  }

  // --- Visa success rate (max +5) ---
  const visa = toNum(uni.visaSuccessRateBD);
  if (visa != null) {
    score += Math.round(Math.max(0, Math.min(5, (visa - 80) / 4)));
    if (visa >= 90) reasons.push(`Strong ${visa}% visa success from Bangladesh`);
  }

  score = Math.max(40, Math.min(99, Math.round(score)));
  return { score, reasons };
}
