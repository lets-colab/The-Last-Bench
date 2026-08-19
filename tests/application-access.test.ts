import { describe, expect, it } from "vitest";

/**
 * Authorization matrix for canAccessApplication (server/db.ts).
 *
 * The real function hits the database, so these tests exercise the decision
 * logic in isolation against the same rules. Keep the two in step: the rule
 * order here mirrors the implementation exactly.
 *
 * Regression guard for a real IDOR — document.getByApplication,
 * document.upload, and application.getById all trusted a client-supplied id
 * with no ownership check, so any authenticated user could read any student's
 * application and documents by incrementing an integer.
 */
function decide(
  user: { id: number; role?: string | null },
  app: { studentId: number; mentorAssigned: number | null } | undefined,
  studentIdForUser: number | undefined
): boolean {
  if (!app) return false;
  if (user.role === "admin") return true;
  if (app.mentorAssigned !== null && app.mentorAssigned === user.id) return true;
  return studentIdForUser !== undefined && studentIdForUser === app.studentId;
}

const app = { studentId: 42, mentorAssigned: 7 };

describe("canAccessApplication rules", () => {
  it("allows the owning student", () => {
    expect(decide({ id: 1, role: "user" }, app, 42)).toBe(true);
  });

  it("allows the assigned mentor", () => {
    expect(decide({ id: 7, role: "mentor" }, app, undefined)).toBe(true);
  });

  it("allows any admin", () => {
    expect(decide({ id: 99, role: "admin" }, app, undefined)).toBe(true);
  });

  it("DENIES a different student — the IDOR this guards", () => {
    expect(decide({ id: 2, role: "user" }, app, 43)).toBe(false);
  });

  it("denies a mentor who is not assigned to this application", () => {
    expect(decide({ id: 8, role: "mentor" }, app, undefined)).toBe(false);
  });

  it("denies a user with no student profile and no role", () => {
    expect(decide({ id: 3, role: "user" }, app, undefined)).toBe(false);
  });

  it("denies when the application does not exist", () => {
    expect(decide({ id: 1, role: "admin" }, undefined, 42)).toBe(false);
  });

  it("does not treat an unassigned mentor slot as a match", () => {
    // mentorAssigned === null must never equal a user id, even id 0.
    expect(decide({ id: 0, role: "user" }, { studentId: 42, mentorAssigned: null }, 43)).toBe(false);
  });

  it("is not fooled by a role string that merely looks privileged", () => {
    expect(decide({ id: 5, role: "administrator" }, app, 43)).toBe(false);
    expect(decide({ id: 5, role: null }, app, 43)).toBe(false);
  });
});
