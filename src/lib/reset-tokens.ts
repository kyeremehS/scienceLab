import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_EXPIRY_MINUTES = 60;

/** Generates a 256-bit reset token; only its SHA-256 hash is persisted. */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function resetExpiryDate(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
}
