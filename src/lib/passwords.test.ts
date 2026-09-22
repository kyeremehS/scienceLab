import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

// FR-STU-01: passwords are securely handled (hashed, never stored plain).
describe("passwords", () => {
  it("hash verifies with the correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct-horse-123");
    expect(hash).not.toContain("correct-horse-123");
    expect(await verifyPassword("correct-horse-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed stored values safely", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
  });

  it("produces unique hashes for the same password (random salt)", async () => {
    const a = await hashPassword("same-password-123");
    const b = await hashPassword("same-password-123");
    expect(a).not.toBe(b);
  });
});
