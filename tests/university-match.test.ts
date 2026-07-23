import { describe, expect, it } from "vitest";
import { scoreUniversityMatch } from "../shared/university-match";

const UM = {
  programs: ["Computer Science", "Business Administration", "Medicine"],
  gpaRequirement: { min: "3.5", typical: "3.8+", outOf: "5.0" },
  visaSuccessRateBD: 91,
};

describe("scoreUniversityMatch", () => {
  it("is deterministic — same inputs, same score", () => {
    const a = scoreUniversityMatch({ gpa: "3.8", fieldOfInterest: "Computer Science" }, UM);
    const b = scoreUniversityMatch({ gpa: "3.8", fieldOfInterest: "Computer Science" }, UM);
    expect(a.score).toBe(b.score);
  });

  it("scores a strong-fit student high", () => {
    const { score } = scoreUniversityMatch({ gpa: "3.9", fieldOfInterest: "Computer Science" }, UM);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("scores a below-bar, off-field student lower than a strong fit", () => {
    const strong = scoreUniversityMatch({ gpa: "3.9", fieldOfInterest: "Computer Science" }, UM).score;
    const weak = scoreUniversityMatch({ gpa: "2.5", fieldOfInterest: "Fine Arts" }, UM).score;
    expect(weak).toBeLessThan(strong);
  });

  it("stays within the 40–99 band", () => {
    const hi = scoreUniversityMatch({ gpa: "5.0", fieldOfInterest: "Medicine" }, UM).score;
    const lo = scoreUniversityMatch({ gpa: "1.0", fieldOfInterest: "Zoology" }, UM).score;
    expect(hi).toBeLessThanOrEqual(99);
    expect(lo).toBeGreaterThanOrEqual(40);
  });

  it("handles a missing profile without throwing, scoring neutrally", () => {
    const { score, reasons } = scoreUniversityMatch({}, UM);
    expect(score).toBeGreaterThanOrEqual(40);
    expect(reasons.some((r) => r.toLowerCase().includes("gpa"))).toBe(true);
  });

  it("credits a matching program by substring either direction", () => {
    const withField = scoreUniversityMatch({ gpa: "3.6", fieldOfInterest: "computer" }, UM).score;
    const noField = scoreUniversityMatch({ gpa: "3.6", fieldOfInterest: "Underwater Basket Weaving" }, UM).score;
    expect(withField).toBeGreaterThan(noField);
  });
});
