import { describe, expect, it } from "vitest";
import { computeSignature, redactErrorText } from "../server/self-healing";

describe("self-healing privacy boundary", () => {
  it("redacts credentials and student contact data before persistence or diagnosis", () => {
    const unsafe =
      "Bearer secret-token student@example.com +8801712345678 " +
      "postgres://user:password@db.example.com/app " +
      "https://oauth.example.com/callback?code=oauth-code&state=oauth-state";
    const redacted = redactErrorText(unsafe);

    expect(redacted).not.toContain("secret-token");
    expect(redacted).not.toContain("student@example.com");
    expect(redacted).not.toContain("01712345678");
    expect(redacted).not.toContain("user:password");
    expect(redacted).not.toContain("oauth-code");
    expect(redacted).not.toContain("oauth-state");
  });

  it("fingerprints the redacted form rather than raw secrets", () => {
    const signature = computeSignature(
      "oauth",
      new Error("failed https://example.com/?token=super-secret"),
    );

    expect(signature).not.toContain("super-secret");
    expect(signature).toContain("[redacted]");
  });
});
