import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import {
  buildResetUrl,
  sendPasswordResetMail,
} from "@/lib/mailer";
import {
  clientIp,
  isRateLimited,
} from "@/lib/rate-limit";
import {
  createResetToken,
  hashResetToken,
  RESET_TOKEN_EXPIRY_MINUTES,
  resetExpiryDate,
} from "@/lib/reset-tokens";
import {
  createSessionToken,
  isSecureRequest,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/session";
import {
  normalizeEmail,
  validateEmail,
  validateLogin,
  validatePassword,
  validateRegistration,
  type UserRole,
} from "@/lib/validation";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

// Dummy hash so login timing does not reveal whether an email exists.
const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

function isUniqueViolation(error: unknown): boolean {
  // Drizzle wraps the driver error: the SQLSTATE lives on `cause`.
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === "object" && current !== null; depth++) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function sessionCookieOptions(req: Request) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: secure || process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}

/**
 * Role comes from the URL path (server-controlled), never from the request
 * body: POST /api/auth/register/student or /api/auth/register/teacher.
 * Satisfies FR-TEA-01 — the server determines the role.
 */
export async function handleRegister(role: UserRole, req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const params = (body ?? {}) as Record<string, unknown>;
  const validationError = validateRegistration(params);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const name = (params.name as string).trim();
  const email = normalizeEmail(params.email as string);
  const passwordHash = await hashPassword(params.password as string);

  try {
    const [created] = await db
      .insert(users)
      .values({ name, email, passwordHash, role })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    if (!created) {
      return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }

    const token = await createSessionToken({ sub: created.id, role: created.role as UserRole });
    const res = NextResponse.json(
      { user: created },
      { status: 201 },
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(req));
    return res;
  } catch (error) {
    // Unique-violation race on email (SQLSTATE 23505) -> safe duplicate error.
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}

export async function handleLogin(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const params = (body ?? {}) as Record<string, unknown>;
  const validationError = validateLogin(params);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const email = normalizeEmail(params.email as string);
  const password = params.password as string;

  try {
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const row = rows[0];
    const ok = row
      ? await verifyPassword(password, row.passwordHash)
      : await verifyPassword(password, DUMMY_HASH).then(() => false);

    if (!row || !ok) {
      // Generic error: never reveal whether the email exists.
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSessionToken({ sub: row.id, role: row.role as UserRole });
    const res = NextResponse.json(
      { user: { id: row.id, name: row.name, email: row.email, role: row.role } },
      { status: 200 },
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(req));
    return res;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}

export async function getRequestSession(req: Request) {
  const match = req.headers.get("cookie")?.match(/(?:^|;\s*)sciencelab_session=([^;]+)/);
  if (!match) return null;
  const payload = await verifySessionToken(match[1]);
  if (!payload) return null;

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);
  return rows[0] ?? null;
}

const RECOVERY_MESSAGE =
  "If an account exists for this email, we've sent a password reset link.";

/**
 * Starts password recovery (FR-AUTH-01). The response is identical whether or
 * not an account exists, so the endpoint never reveals account existence.
 */
export async function handleForgotPassword(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const params = (body ?? {}) as Record<string, unknown>;
  if (validateEmail(params.email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (isRateLimited(`forgot:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const email = normalizeEmail(params.email as string);
    const rows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const row = rows[0];
    if (row) {
      // Retire prior unused tokens so only the newest link works.
      await db
        .delete(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, row.id),
            isNull(passwordResetTokens.usedAt),
          ),
        );

      const { token, tokenHash } = createResetToken();
      await db.insert(passwordResetTokens).values({
        userId: row.id,
        tokenHash,
        expiresAt: resetExpiryDate(),
      });

      await sendPasswordResetMail({
        to: row.email,
        resetUrl: buildResetUrl(req, token),
        expiresMinutes: RESET_TOKEN_EXPIRY_MINUTES,
      });
    }

    return NextResponse.json({ message: RECOVERY_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("Password recovery request failed:", error);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}

/**
 * Redeems a reset token and sets a new password (FR-AUTH-02). The token is
 * marked used atomically with the password change and can never be reused.
 */
export async function handleResetPassword(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const params = (body ?? {}) as Record<string, unknown>;
  if (typeof params.token !== "string" || params.token.length === 0) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }
  const passwordError = validatePassword(params.password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  if (isRateLimited(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const tokenHash = hashResetToken(params.token);
    const rows = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    const row = rows[0];
    if (!row || row.usedAt !== null || row.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(params.password as string);
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Request failed. Please try again." }, { status: 500 });
  }
}
