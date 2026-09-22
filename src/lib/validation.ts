export type UserRole = "STUDENT" | "TEACHER";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
}

/** Returns a user-safe error message, or null when valid. Extra fields (e.g. a client-provided role) are ignored. */
export function validateRegistration(input: Record<string, unknown>): string | null {
  if (typeof input.name !== "string" || input.name.trim().length < 2) {
    return "Name must be at least 2 characters.";
  }
  if (input.name.trim().length > 100) {
    return "Name must be at most 100 characters.";
  }
  if (typeof input.email !== "string" || !EMAIL_RE.test(input.email.trim())) {
    return "Enter a valid email address.";
  }
  if (typeof input.password !== "string" || input.password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (input.password.length > 128) {
    return "Password must be at most 128 characters.";
  }
  return null;
}

/** Returns a user-safe error message, or null when valid. */
export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

/** Returns a user-safe error message, or null when valid. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > 128) {
    return "Password must be at most 128 characters.";
  }
  return null;
}

/** Returns a user-safe error message, or null when valid. */
export function validateLogin(input: { email?: unknown; password?: unknown }): string | null {
  if (typeof input.email !== "string" || !EMAIL_RE.test(input.email.trim())) {
    return "Enter a valid email address.";
  }
  if (typeof input.password !== "string" || input.password.length === 0) {
    return "Enter your password.";
  }
  return null;
}
