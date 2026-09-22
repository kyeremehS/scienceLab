import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import {
  createSessionToken,
  isSecureRequest,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/session";
import {
  normalizeEmail,
  validateLogin,
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
