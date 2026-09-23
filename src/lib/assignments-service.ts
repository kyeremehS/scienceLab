import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  classes,
  experimentVersions,
} from "@/db/schema";
import { getRequestSession } from "@/lib/auth-service";
import { getRequestId, logError } from "@/lib/logger";

type SessionUser = { id: string; name: string; email: string; role: string };

async function requireTeacher(req: Request): Promise<SessionUser | null> {
  const user = await getRequestSession(req);
  if (!user || user.role !== "TEACHER") return null;
  return user;
}

/** The class must belong to the requesting teacher; otherwise null (denied). */
async function ownedClass(teacherId: string, classId: string) {
  const rows = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  const row = rows[0];
  if (!row || row.teacherId !== teacherId) return null;
  return row;
}

async function scopedAssignment(teacherId: string, classId: string, assignmentId: string) {
  const cls = await ownedClass(teacherId, classId);
  if (!cls) return null;
  const rows = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.classId, classId)))
    .limit(1);
  return rows[0] ?? null;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === "object" && current !== null; depth++) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function parseOptionalDate(value: unknown): { ok: boolean; date: Date | null; error?: string } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };
  if (typeof value !== "string") return { ok: false, date: null, error: "Dates must be ISO strings." };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false, date: null, error: "Dates must be ISO strings." };
  return { ok: true, date };
}

async function withExperimentTitle<T extends { experimentVersionId: string }>(
  rows: T[],
): Promise<(T & { experimentTitle: string })[]> {
  return Promise.all(
    rows.map(async (r) => {
      const vRows = await db
        .select({ title: experimentVersions.title })
        .from(experimentVersions)
        .where(eq(experimentVersions.id, r.experimentVersionId))
        .limit(1);
      return { ...r, experimentTitle: vRows[0]?.title ?? "Experiment" };
    }),
  );
}

/**
 * GET /api/classes/[id]/assignments — assignments of an owned class (FR-TEA-19).
 */
export async function handleListAssignments(req: Request, classId: string): Promise<NextResponse> {
  const teacher = await requireTeacher(req);
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const cls = await ownedClass(teacher.id, classId);
  if (!cls) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const rows = await db
    .select()
    .from(assignments)
    .where(eq(assignments.classId, classId))
    .orderBy(asc(assignments.assignedAt));
  return NextResponse.json({ assignments: await withExperimentTitle(rows) }, { status: 200 });
}

/**
 * POST /api/classes/[id]/assignments (FR-TEA-15–FR-TEA-18).
 * Locks the experiment's current published version; creates no attempts.
 */
export async function handleCreateAssignment(req: Request, classId: string): Promise<NextResponse> {
  const teacher = await requireTeacher(req);
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const cls = await ownedClass(teacher.id, classId);
  if (!cls) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const params = (body ?? {}) as Record<string, unknown>;
  const experimentId = typeof params.experimentId === "string" ? params.experimentId : "";
  if (experimentId.length === 0) {
    return NextResponse.json({ error: "Choose an experiment to assign." }, { status: 400 });
  }
  const start = parseOptionalDate(params.startAt);
  const due = parseOptionalDate(params.dueAt);
  if (!start.ok) return NextResponse.json({ error: start.error }, { status: 400 });
  if (!due.ok) return NextResponse.json({ error: due.error }, { status: 400 });
  if (start.date && due.date && due.date < start.date) {
    return NextResponse.json({ error: "Due date cannot be before the start date." }, { status: 400 });
  }

  // New assignments reference the current published version and lock it.
  const vRows = await db
    .select()
    .from(experimentVersions)
    .where(
      and(
        eq(experimentVersions.experimentId, experimentId),
        eq(experimentVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  const version = vRows[0];
  if (!version) {
    return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
  }

  try {
    const [created] = await db
      .insert(assignments)
      .values({
        classId: cls.id,
        teacherId: teacher.id,
        experimentId,
        experimentVersionId: version.id,
        startAt: start.date,
        dueAt: due.date,
      })
      .returning();
    const [withTitle] = await withExperimentTitle([created]);
    return NextResponse.json({ assignment: withTitle }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "This experiment is already assigned to the class." },
        { status: 409 },
      );
    }
    logError(getRequestId(req), "Assignment creation failed", error);
    return NextResponse.json({ error: "Could not create the assignment." }, { status: 500 });
  }
}

/**
 * GET /api/classes/[id]/assignments/[assignmentId] (FR-TEA-19).
 */
export async function handleGetAssignment(
  req: Request,
  classId: string,
  assignmentId: string,
): Promise<NextResponse> {
  const teacher = await requireTeacher(req);
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const row = await scopedAssignment(teacher.id, classId, assignmentId);
  if (!row) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  const [withTitle] = await withExperimentTitle([row]);
  return NextResponse.json({ assignment: withTitle }, { status: 200 });
}

/**
 * PATCH /api/classes/[id]/assignments/[assignmentId] (FR-TEA-20, FR-TEA-21).
 * Only start/due dates are mutable; the experiment can never be replaced.
 */
export async function handleUpdateAssignment(
  req: Request,
  classId: string,
  assignmentId: string,
): Promise<NextResponse> {
  const teacher = await requireTeacher(req);
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const row = await scopedAssignment(teacher.id, classId, assignmentId);
  if (!row) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  if (row.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Only active assignments can be changed." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const params = (body ?? {}) as Record<string, unknown>;
  if (
    (params.experimentId !== undefined && params.experimentId !== row.experimentId) ||
    (params.experimentVersionId !== undefined && params.experimentVersionId !== row.experimentVersionId)
  ) {
    return NextResponse.json(
      { error: "The experiment on an assignment cannot be replaced. Create a new assignment instead." },
      { status: 400 },
    );
  }
  const start = parseOptionalDate(params.startAt);
  const due = parseOptionalDate(params.dueAt);
  if (!start.ok) return NextResponse.json({ error: start.error }, { status: 400 });
  if (!due.ok) return NextResponse.json({ error: due.error }, { status: 400 });
  const nextStart = params.startAt === undefined ? row.startAt : start.date;
  const nextDue = params.dueAt === undefined ? row.dueAt : due.date;
  if (nextStart && nextDue && nextDue < nextStart) {
    return NextResponse.json({ error: "Due date cannot be before the start date." }, { status: 400 });
  }

  const updated = await db
    .update(assignments)
    .set({ startAt: nextStart, dueAt: nextDue, updatedAt: new Date() })
    .where(eq(assignments.id, row.id))
    .returning();
  const [withTitle] = await withExperimentTitle(updated);
  return NextResponse.json({ assignment: withTitle }, { status: 200 });
}

/**
 * POST /api/classes/[id]/assignments/[assignmentId]/close (FR-TEA-24).
 * CLOSED and CANCELLED are terminal and equivalent: history preserved,
 * no longer active required work.
 */
export async function handleCloseAssignment(
  req: Request,
  classId: string,
  assignmentId: string,
): Promise<NextResponse> {
  const teacher = await requireTeacher(req);
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const row = await scopedAssignment(teacher.id, classId, assignmentId);
  if (!row) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const status = (body as Record<string, unknown>)?.status;
  if (status !== "CLOSED" && status !== "CANCELLED") {
    return NextResponse.json({ error: "Choose to close or cancel the assignment." }, { status: 400 });
  }
  if (row.status !== "ACTIVE") {
    if (row.status === status) {
      const [withTitle] = await withExperimentTitle([row]);
      return NextResponse.json({ assignment: withTitle }, { status: 200 });
    }
    return NextResponse.json(
      { error: "This assignment is already closed and preserves its history." },
      { status: 409 },
    );
  }

  const updated = await db
    .update(assignments)
    .set({ status, updatedAt: new Date() })
    .where(eq(assignments.id, row.id))
    .returning();
  const [withTitle] = await withExperimentTitle(updated);
  return NextResponse.json({ assignment: withTitle }, { status: 200 });
}
