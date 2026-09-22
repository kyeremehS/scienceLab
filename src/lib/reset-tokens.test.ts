import { describe, expect, it } from "vitest";
import {
  createResetToken,
  hashResetToken,
  RESET_TOKEN_EXPIRY_MINUTES,
  resetExpiryDate,
} from "./reset-tokens";

// FR-AUTH-01/02: token shape, hashing, expiry.
describe("reset tokens", () => {
  it("generates unique tokens whose hashes verify", () => {
    const a = createResetToken();
    const b = createResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toHaveLength(64);
    expect(hashResetToken(a.token)).toBe(a.tokenHash);
    expect(hashResetToken(b.token)).toBe(a.tokenHash === b.tokenHash ? a.tokenHash : b.tokenHash);
  });

  it("never exposes the raw token in the hash", () => {
    const { token, tokenHash } = createResetToken();
    expect(tokenHash).not.toContain(token.slice(0, 8));
    expect(tokenHash).toHaveLength(64);
  });

  it("expires one hour after creation", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(resetExpiryDate(now).getTime() - now.getTime()).toBe(
      RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );
    expect(RESET_TOKEN_EXPIRY_MINUTES).toBe(60);
  });
});
