import "dotenv/config";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { handleForgotPassword, handleLogin, handleRegister, handleResetPassword } from "@/lib/auth-service";
import { clearRateLimits } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/reset-tokens";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();
const existingEmail = `reset-existing-${stamp}@example.com`;
const missingEmail = `reset-missing-${stamp}@example.com`;

function post(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// FR-AUTH-01 / FR-AUTH-02 end-to-end against real PostgreSQL.
describe.skipIf(!hasDb)("password recovery flow", () => {
  beforeEach(() => clearRateLimits());

  afterAll(async () => {
    const ids = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(like(users.email, `reset-%-${stamp}@example.com`))
    ).map((r) => r.id);
    for (const id of ids) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
  });

  it("registers a user, then returns identical responses for existing and missing emails", async () => {
    const reg = await handleRegister("STUDENT", post("/api/auth/register/student", {
      name: "Reset User",
      email: existingEmail,
      password: "password123",
    }));
    expect(reg.status).toBe(201);

    const yes = await handleForgotPassword(post("/api/auth/forgot-password", { email: existingEmail }));
    const no = await handleForgotPassword(post("/api/auth/forgot-password", { email: missingEmail }));
    expect(yes.status).toBe(200);
    expect(no.status).toBe(200);
    // Enumeration safety: byte-identical bodies.
    expect(await yes.text()).toBe(await no.text());

    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, (await tokenForUser(existingEmail)) ?? "none"));
    expect(rows.length).toBe(1);
  });

  it("redeems a valid token once, then refuses reuse; login works with the new password", async () => {
    const { token } = await seedToken(existingEmail);
    const first = await handleResetPassword(post("/api/auth/reset-password", { token, password: "newpassword456" }));
    expect(first.status).toBe(200);

    const reuse = await handleResetPassword(post("/api/auth/reset-password", { token, password: "anotherpass789" }));
    expect(reuse.status).toBe(400);

    const login = await handleLogin(post("/api/auth/login", { email: existingEmail, password: "newpassword456" }));
    expect(login.status).toBe(200);
    const oldLogin = await handleLogin(post("/api/auth/login", { email: existingEmail, password: "password123" }));
    expect(oldLogin.status).toBe(401);
  });

  it("refuses expired and unknown tokens with the same safe error", async () => {
    const { token } = await seedToken(existingEmail, new Date(Date.now() - 1000));
    const expired = await handleResetPassword(post("/api/auth/reset-password", { token, password: "somepass123" }));
    const unknown = await handleResetPassword(post("/api/auth/reset-password", {
      token: "0".repeat(64),
      password: "somepass123",
    }));
    expect(expired.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(await expired.text()).toBe(await unknown.text());
  });

  it("rate-limits recovery requests", async () => {
    for (let i = 0; i < 10; i++) {
      await handleForgotPassword(post("/api/auth/forgot-password", { email: missingEmail }));
    }
    const limited = await handleForgotPassword(post("/api/auth/forgot-password", { email: missingEmail }));
    expect(limited.status).toBe(429);
  });
});

async function tokenForUser(email: string): Promise<string | null> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return null;
  const [row] = await db
    .select({ tokenHash: passwordResetTokens.tokenHash })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id))
    .limit(1);
  return row?.tokenHash ?? null;
}

/** Inserts a live token directly (avoids depending on the mailer in tests). */
async function seedToken(email: string, expiresAt?: Date): Promise<{ token: string }> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error("seed user missing");
  const { token, tokenHash } = createResetToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt: expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
  });
  return { token };
}
