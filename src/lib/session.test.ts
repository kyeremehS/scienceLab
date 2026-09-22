import { describe, expect, it } from "vitest";

process.env.SESSION_SECRET = "test-secret-that-is-long-enough-000000";

import { createSessionToken, verifySessionToken } from "./session";

// Session creation/verification backing FR-STU-02/FR-TEA-02.
describe("session tokens", () => {
  it("round-trips a valid payload", async () => {
    const token = await createSessionToken({ sub: "user-123", role: "STUDENT" });
    expect(await verifySessionToken(token)).toEqual({ sub: "user-123", role: "STUDENT" });
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken({ sub: "user-123", role: "STUDENT" });
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects garbage input safely", async () => {
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("not-a-token")).toBeNull();
  });
});
