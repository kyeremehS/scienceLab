import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  validateEmail,
  validateLogin,
  validatePassword,
  validateRegistration,
} from "./validation";

// FR-STU-01 / FR-TEA-01: registration input validation (CR-03).
describe("validateRegistration", () => {
  it("accepts valid input", () => {
    expect(
      validateRegistration({ name: "Ada Lovelace", email: "ada@example.com", password: "password123" }),
    ).toBeNull();
  });

  it("rejects a missing or short name", () => {
    expect(validateRegistration({ name: "A", email: "a@example.com", password: "password123" })).not.toBeNull();
    expect(validateRegistration({ email: "a@example.com", password: "password123" })).not.toBeNull();
  });

  it("rejects an invalid email", () => {
    expect(
      validateRegistration({ name: "Ada", email: "not-an-email", password: "password123" }),
    ).not.toBeNull();
  });

  it("rejects a short password", () => {
    expect(
      validateRegistration({ name: "Ada", email: "ada@example.com", password: "short" }),
    ).not.toBeNull();
  });

  it("ignores unknown fields such as a client-provided role", () => {
    // FR-TEA-01: the server determines the role; validation must not depend on it.
    expect(
      validateRegistration({
        name: "Ada",
        email: "ada@example.com",
        password: "password123",
        role: "ADMIN",
      }),
    ).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });
});

// FR-AUTH-01/02: recovery input validation.
describe("validateEmail", () => {
  it("accepts valid emails and rejects the rest", () => {
    expect(validateEmail("ada@example.com")).toBeNull();
    expect(validateEmail("bad")).not.toBeNull();
    expect(validateEmail(undefined)).not.toBeNull();
  });
});

describe("validatePassword", () => {
  it("enforces the registration password rules", () => {
    expect(validatePassword("password123")).toBeNull();
    expect(validatePassword("short")).not.toBeNull();
    expect(validatePassword(undefined)).not.toBeNull();
  });
});
describe("validateLogin", () => {
  it("accepts valid input", () => {
    expect(validateLogin({ email: "ada@example.com", password: "anything" })).toBeNull();
  });

  it("rejects invalid email or missing password", () => {
    expect(validateLogin({ email: "bad", password: "x" })).not.toBeNull();
    expect(validateLogin({ email: "ada@example.com", password: "" })).not.toBeNull();
  });
});
