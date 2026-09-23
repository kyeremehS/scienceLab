import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships, users } from "@/db/schema";
import { getRequestSession } from "@/lib/auth-service";
import { generateClassCode } from "@/lib/class-codes";
import { getRequestId, logError } from "@/lib/logger";

type SessionUser = { id: string; name: string; email: string; role: string };

async function requireRole(req: Request, role: "TEACHER" | "STUDENT"): Promise<SessionUser | null> {
  const user = await getRequestSession(req);
  if (!user || user.role !== role) return null;
  return user;
}

/** The class must belong to the requesting teacher; otherwise null (denied). */
async function ownedClass(teacherId: string, classId: string) {
  const rows = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  const row = rows[0];
  if (!row || row.teacherId !== teacherId) return null;
  return row;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === "object" && current !== null; depth++) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** POST /api/classes — teacher creates a class (FR-TEA-05). */
export async function handleCreateClass(req: Request): Promise<NextResponse> {
  const teacher = await requireRole(req, "TEACHER");
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const params = (body ?? {}) as Record<string, unknown>;
  const name = typeof params.name === "string" ? params.name.trim() : "";
  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Class name must be 2–100 characters." }, { status: 400 });
  }
  const description =
    typeof params.description === "string" && params.description.trim().length > 0
      ? params.description.trim().slice(0, 500)
      : null;

  // Collision-retry: codes are globally unique (DATABASE_SCHEMA.md §6).
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [created] = await db
        .insert(classes)
        .values({ teacherId: teacher.id, name, description, code: generateClassCode() })
        .returning();
      return NextResponse.json({ class: created }, { status: 201 });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        logError(getRequestId(req), "Class creation failed", error);
        return NextResponse.json({ error: "Could not create the class." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: "Could not create the class." }, { status: 500 });
}

/** GET /api/classes — teacher's own classes with active student counts. */
export async function handleListClasses(req: Request): Promise<NextResponse> {
  const teacher = await requireRole(req, "TEACHER");
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const owned = await db.select().from(classes).where(eq(classes.teacherId, teacher.id));
  const withCounts = await Promise.all(
    owned.map(async (c) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(classMemberships)
        .where(
          and(eq(classMemberships.classId, c.id), eq(classMemberships.active, true)),
        );
      return { ...c, studentCount: value, activeAssignments: [] as unknown[] };
    }),
  );
  return NextResponse.json({ classes: withCounts }, { status: 200 });
}

/** GET /api/classes/[id] — class detail with members (own classes only). */
export async function handleGetClass(req: Request, classId: string): Promise<NextResponse> {
  const teacher = await requireRole(req, "TEACHER");
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const row = await ownedClass(teacher.id, classId);
  if (!row) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const members = await db
    .select({
      id: classMemberships.id,
      studentId: classMemberships.studentId,
      studentName: users.name,
      joinedAt: classMemberships.joinedAt,
      active: classMemberships.active,
    })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.studentId))
    .where(and(eq(classMemberships.classId, classId), eq(classMemberships.active, true)));

  return NextResponse.json(
    { class: row, members, assignedExperiments: [] as unknown[] },
    { status: 200 },
  );
}

/** DELETE /api/classes/[id]/members/[studentId] — end membership, keep history. */
export async function handleRemoveMember(
  req: Request,
  classId: string,
  studentId: string,
): Promise<NextResponse> {
  const teacher = await requireRole(req, "TEACHER");
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const row = await ownedClass(teacher.id, classId);
  if (!row) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const updated = await db
    .update(classMemberships)
    .set({ active: false, leftAt: new Date() })
    .where(
      and(
        eq(classMemberships.classId, classId),
        eq(classMemberships.studentId, studentId),
        eq(classMemberships.active, true),
      ),
    )
    .returning({ id: classMemberships.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Membership not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}

/** POST /api/classes/join — student joins by code (FR-TEA-11). */
export async function handleJoinClass(req: Request): Promise<NextResponse> {
  const student = await requireRole(req, "STUDENT");
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const code =
    typeof (body as Record<string, unknown>)?.code === "string"
      ? ((body as Record<string, unknown>).code as string).trim().toUpperCase()
      : "";
  if (code.length === 0) {
    return NextResponse.json({ error: "Enter a class code." }, { status: 400 });
  }

  const found = await db.select().from(classes).where(eq(classes.code, code)).limit(1);
  const row = found[0];
  if (!row) return NextResponse.json({ error: "Invalid class code." }, { status: 404 });

  try {
    const [membership] = await db
      .insert(classMemberships)
      .values({ classId: row.id, studentId: student.id })
      .returning();
    return NextResponse.json(
      { membership, class: { id: row.id, name: row.name } },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      // FR-TEA-12: already a member — clear refusal, no duplicate.
      return NextResponse.json(
        { error: "You are already a member of this class." },
        { status: 409 },
      );
    }
    logError(getRequestId(req), "Class join failed", error);
    return NextResponse.json({ error: "Could not join the class." }, { status: 500 });
  }
}

/** GET /api/classes/joined — student's own classes (FR-STU-32). */
export async function handleJoinedClasses(req: Request): Promise<NextResponse> {
  const student = await requireRole(req, "STUDENT");
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      teacherName: users.name,
      joinedAt: classMemberships.joinedAt,
    })
    .from(classMemberships)
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .innerJoin(users, eq(users.id, classes.teacherId))
    .where(
      and(
        eq(classMemberships.studentId, student.id),
        eq(classMemberships.active, true),
      ),
    );

  return NextResponse.json({ classes: rows }, { status: 200 });
}

/**
 * POST /api/classes/[id]/leave — student leaves a joined class (FR-STU-33).
 * Membership ends; learning history is preserved, mirroring teacher removal.
 */
export async function handleLeaveClass(req: Request, classId: string): Promise<NextResponse> {
  const student = await requireRole(req, "STUDENT");
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const updated = await db
    .update(classMemberships)
    .set({ active: false, leftAt: new Date() })
    .where(
      and(
        eq(classMemberships.classId, classId),
        eq(classMemberships.studentId, student.id),
        eq(classMemberships.active, true),
      ),
    )
    .returning({ id: classMemberships.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Membership not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
