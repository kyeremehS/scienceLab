import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  classMemberships,
  experimentAttempts,
  experimentSteps,
  experimentVersions,
  observationDefinitions,
  observations,
  stepProgress,
} from "@/db/schema";
import { getRequestSession } from "@/lib/auth-service";
import { getRequestId, logError } from "@/lib/logger";

type SessionUser = { id: string; name: string; email: string; role: string };

type AttemptRow = typeof experimentAttempts.$inferSelect;
type StepRow = typeof experimentSteps.$inferSelect;

async function requireStudent(req: Request): Promise<SessionUser | null> {
  const user = await getRequestSession(req);
  if (!user || user.role !== "STUDENT") return null;
  return user;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === "object" && current !== null; depth++) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** The attempt must belong to the requesting student; otherwise null (denied). */
async function ownedAttempt(studentId: string, attemptId: string): Promise<AttemptRow | null> {
  const rows = await db
    .select()
    .from(experimentAttempts)
    .where(eq(experimentAttempts.id, attemptId))
    .limit(1);
  const row = rows[0];
  if (!row || row.studentId !== studentId) return null;
  return row;
}

async function activeClassIds(studentId: string): Promise<string[]> {
  const rows = await db
    .select({ classId: classMemberships.classId })
    .from(classMemberships)
    .where(and(eq(classMemberships.studentId, studentId), eq(classMemberships.active, true)));
  return rows.map((r) => r.classId);
}

/**
 * FR-STU-07: incomplete ACTIVE assignments across all of the student's active
 * classes. An assignment is incomplete while the student has no COMPLETED
 * attempt for its experiment. Closed/cancelled assignments never count.
 */
async function blockingAssignments(studentId: string) {
  const classIds = await activeClassIds(studentId);
  if (classIds.length === 0) return [];
  const actives = await db
    .select({ id: assignments.id, experimentId: assignments.experimentId })
    .from(assignments)
    .where(and(inArray(assignments.classId, classIds), eq(assignments.status, "ACTIVE")));
  if (actives.length === 0) return [];
  const attempts = await db
    .select({ experimentId: experimentAttempts.experimentId, status: experimentAttempts.status })
    .from(experimentAttempts)
    .where(eq(experimentAttempts.studentId, studentId));
  const completed = new Set(
    attempts.filter((a) => a.status === "COMPLETED").map((a) => a.experimentId),
  );
  return actives.filter((a) => !completed.has(a.experimentId));
}

type AttemptState = {
  attempt: AttemptRow;
  steps: {
    id: string;
    order: number;
    title: string;
    instructions: string;
    status: "NOT_STARTED" | "CURRENT" | "COMPLETED";
    observations: {
      definitionId: string;
      prompt: string;
      required: boolean;
      observationId: string | null;
      responseText: string | null;
    }[];
  }[];
  progress: {
    totalSteps: number;
    completedSteps: number;
    currentStepId: string | null;
    requiredObservationsTotal: number;
    requiredObservationsRecorded: number;
  };
};

/** Full resumable state for one attempt (FR-STU-11: refresh/leave/resume safe). */
export async function buildAttemptState(attempt: AttemptRow): Promise<AttemptState> {
  const steps = await db
    .select()
    .from(experimentSteps)
    .where(eq(experimentSteps.experimentVersionId, attempt.experimentVersionId))
    .orderBy(asc(experimentSteps.stepOrder));

  const progressRows = await db
    .select()
    .from(stepProgress)
    .where(eq(stepProgress.attemptId, attempt.id));
  const progressByStep = new Map(progressRows.map((p) => [p.experimentStepId, p]));

  const stepIds = steps.map((s) => s.id);
  const defs =
    stepIds.length === 0
      ? []
      : await db
          .select()
          .from(observationDefinitions)
          .where(inArray(observationDefinitions.experimentStepId, stepIds))
          .orderBy(asc(observationDefinitions.displayOrder));
  const recorded = await db
    .select()
    .from(observations)
    .where(eq(observations.attemptId, attempt.id));
  const recordedByDef = new Map(recorded.map((o) => [o.observationDefinitionId, o]));

  const defsByStep = new Map<string, typeof defs>();
  for (const d of defs) {
    const list = defsByStep.get(d.experimentStepId) ?? [];
    list.push(d);
    defsByStep.set(d.experimentStepId, list);
  }

  let completedSteps = 0;
  let currentStepId: string | null = null;
  let requiredTotal = 0;
  let requiredRecorded = 0;

  const stateSteps = steps.map((s) => {
    const row = progressByStep.get(s.id);
    const status = row ? row.status : "NOT_STARTED";
    if (status === "COMPLETED") completedSteps += 1;
    if (status === "CURRENT" && currentStepId === null) currentStepId = s.id;
    const stepDefs = defsByStep.get(s.id) ?? [];
    return {
      id: s.id,
      order: s.stepOrder,
      title: s.title,
      instructions: s.instructions,
      status: status as "NOT_STARTED" | "CURRENT" | "COMPLETED",
      observations: stepDefs.map((d) => {
        const rec = recordedByDef.get(d.id);
        if (d.required) {
          requiredTotal += 1;
          if (rec) requiredRecorded += 1;
        }
        return {
          definitionId: d.id,
          prompt: d.prompt,
          required: d.required,
          observationId: rec ? rec.id : null,
          responseText: rec ? rec.responseText : null,
        };
      }),
    };
  });

  return {
    attempt,
    steps: stateSteps,
    progress: {
      totalSteps: steps.length,
      completedSteps,
      currentStepId,
      requiredObservationsTotal: requiredTotal,
      requiredObservationsRecorded: requiredRecorded,
    },
  };
}

async function resume(attempt: AttemptRow): Promise<NextResponse> {
  const state = await buildAttemptState(attempt);
  return NextResponse.json({ attempt: state, resumed: true }, { status: 200 });
}

/**
 * POST /api/experiments/[id]/start — start or resume (FR-STU-07–FR-STU-09).
 * Optional body { assignmentId } for an assignment-based start; otherwise the
 * start is independent and the assignment gate applies.
 */
export async function handleStartExperiment(req: Request, experimentId: string): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let assignmentId: string | null = null;
  try {
    const body = (await req.json().catch(() => null) ?? {}) as Record<string, unknown>;
    if (typeof body.assignmentId === "string" && body.assignmentId.length > 0) {
      assignmentId = body.assignmentId;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // FR-STU-09: one attempt per experiment — resume whatever exists, however
  // it was originally started (assigned or independent).
  const existing = await db
    .select()
    .from(experimentAttempts)
    .where(
      and(
        eq(experimentAttempts.studentId, student.id),
        eq(experimentAttempts.experimentId, experimentId),
      ),
    )
    .limit(1);
  if (existing[0]) return resume(existing[0]);

  let versionId: string;
  if (assignmentId) {
    // Assignment-based start: inherit the assignment's locked version.
    const aRows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .limit(1);
    const a = aRows[0];
    if (!a || a.status !== "ACTIVE" || a.experimentId !== experimentId) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }
    const member = await db
      .select({ id: classMemberships.id })
      .from(classMemberships)
      .where(
        and(
          eq(classMemberships.classId, a.classId),
          eq(classMemberships.studentId, student.id),
          eq(classMemberships.active, true),
        ),
      )
      .limit(1);
    if (member.length === 0) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }
    versionId = a.experimentVersionId;
  } else {
    // Assigned experiments are always startable (USER_FLOWS.md §1.4–§1.5):
    // an ACTIVE assignment for this experiment makes the start
    // assignment-based, inheriting the locked version with no gate.
    const ownAssignment = await db
      .select({
        id: assignments.id,
        versionId: assignments.experimentVersionId,
      })
      .from(assignments)
      .innerJoin(classMemberships, eq(classMemberships.classId, assignments.classId))
      .where(
        and(
          eq(classMemberships.studentId, student.id),
          eq(classMemberships.active, true),
          eq(assignments.experimentId, experimentId),
          eq(assignments.status, "ACTIVE"),
        ),
      )
      .limit(1);
    if (ownAssignment[0]) {
      assignmentId = ownAssignment[0].id;
      versionId = ownAssignment[0].versionId;
    } else {
      // Independent start: current published version + assignment gate.
      const blocking = await blockingAssignments(student.id);
      if (blocking.length > 0) {
        return NextResponse.json(
          {
            error:
              "Complete your assigned experiments before starting a new one. Your teacher's assignments are your required work.",
            blockedBy: blocking.map((b) => b.experimentId),
          },
          { status: 403 },
        );
      }
      const vRows = await db
        .select({ id: experimentVersions.id })
        .from(experimentVersions)
        .where(
          and(
            eq(experimentVersions.experimentId, experimentId),
            eq(experimentVersions.status, "PUBLISHED"),
          ),
        )
        .limit(1);
      if (!vRows[0]) return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
      versionId = vRows[0].id;
    }
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(experimentAttempts)
        .values({
          studentId: student.id,
          experimentId,
          experimentVersionId: versionId,
          assignmentId,
        })
        .returning();
      const firstSteps = await tx
        .select({ id: experimentSteps.id })
        .from(experimentSteps)
        .where(eq(experimentSteps.experimentVersionId, versionId))
        .orderBy(asc(experimentSteps.stepOrder))
        .limit(1);
      if (firstSteps[0]) {
        await tx.insert(stepProgress).values({
          attemptId: attempt.id,
          experimentStepId: firstSteps[0].id,
          status: "CURRENT",
        });
      }
      return attempt;
    });
    const state = await buildAttemptState(created);
    return NextResponse.json({ attempt: state, resumed: false }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Concurrent duplicate start (CR-06): exactly one attempt survives.
      const raced = await db
        .select()
        .from(experimentAttempts)
        .where(
          and(
            eq(experimentAttempts.studentId, student.id),
            eq(experimentAttempts.experimentId, experimentId),
          ),
        )
        .limit(1);
      if (raced[0]) return resume(raced[0]);
    }
    logError(getRequestId(req), "Experiment start failed", error);
    return NextResponse.json({ error: "Could not start the experiment." }, { status: 500 });
  }
}

/** GET /api/attempts/[id] — own attempt state (FR-STU-11, FR-STU-31). */
export async function handleGetAttempt(req: Request, attemptId: string): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const attempt = await ownedAttempt(student.id, attemptId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  const state = await buildAttemptState(attempt);
  return NextResponse.json({ attempt: state }, { status: 200 });
}

function findStep(steps: StepRow[], stepId: string): StepRow | null {
  return steps.find((s) => s.id === stepId) ?? null;
}

/**
 * POST /api/attempts/[id]/steps/[stepId]/complete (FR-STU-10–FR-STU-13).
 * Sequential progression, server-enforced; backward review needs no write.
 */
export async function handleCompleteStep(
  req: Request,
  attemptId: string,
  stepId: string,
): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const attempt = await ownedAttempt(student.id, attemptId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "This experiment is completed and can no longer be changed." },
      { status: 409 },
    );
  }

  const steps = await db
    .select()
    .from(experimentSteps)
    .where(eq(experimentSteps.experimentVersionId, attempt.experimentVersionId))
    .orderBy(asc(experimentSteps.stepOrder));
  const step = findStep(steps, stepId);
  if (!step) return NextResponse.json({ error: "Step not found." }, { status: 404 });

  const progressRows = await db
    .select()
    .from(stepProgress)
    .where(eq(stepProgress.attemptId, attempt.id));
  const completedOrders = new Set(
    progressRows.filter((p) => p.status === "COMPLETED").map((p) => {
      const s = steps.find((x) => x.id === p.experimentStepId);
      return s ? s.stepOrder : -1;
    }),
  );
  const missing = steps.filter((s) => s.stepOrder < step.stepOrder && !completedOrders.has(s.stepOrder));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Complete step ${missing[0].stepOrder} (“${missing[0].title}”) first.`,
        nextRequiredOrder: missing[0].stepOrder,
      },
      { status: 422 },
    );
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(stepProgress)
        .values({ attemptId: attempt.id, experimentStepId: step.id, status: "COMPLETED", completedAt: new Date() })
        .onConflictDoUpdate({
          target: [stepProgress.attemptId, stepProgress.experimentStepId],
          set: { status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() },
        });
      const next = steps.find((s) => s.stepOrder === step.stepOrder + 1);
      if (next) {
        await tx
          .insert(stepProgress)
          .values({ attemptId: attempt.id, experimentStepId: next.id, status: "CURRENT" })
          .onConflictDoNothing({
            target: [stepProgress.attemptId, stepProgress.experimentStepId],
          });
      }
    });
  } catch (error) {
    logError(getRequestId(req), "Step completion failed", error);
    return NextResponse.json({ error: "Could not complete the step." }, { status: 500 });
  }

  const state = await buildAttemptState(attempt);
  return NextResponse.json({ attempt: state }, { status: 200 });
}

/**
 * POST /api/attempts/[id]/observations (FR-STU-14–FR-STU-16).
 * Body: { observationDefinitionId, responseText }.
 */
export async function handleRecordObservation(req: Request, attemptId: string): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const attempt = await ownedAttempt(student.id, attemptId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "This experiment is completed and can no longer be changed." },
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
  const definitionId =
    typeof params.observationDefinitionId === "string" ? params.observationDefinitionId : "";
  const responseText =
    typeof params.responseText === "string" ? params.responseText.trim() : "";
  if (definitionId.length === 0) {
    return NextResponse.json({ error: "Choose an observation to record." }, { status: 400 });
  }
  if (responseText.length === 0) {
    return NextResponse.json({ error: "Observation text is required." }, { status: 400 });
  }
  if (responseText.length > 2000) {
    return NextResponse.json(
      { error: "Observation must be 2000 characters or fewer." },
      { status: 400 },
    );
  }

  // Definition must belong to this attempt's experiment version (via its step).
  const defRows = await db
    .select({ id: observationDefinitions.id, stepId: observationDefinitions.experimentStepId })
    .from(observationDefinitions)
    .where(eq(observationDefinitions.id, definitionId))
    .limit(1);
  const def = defRows[0];
  if (!def) return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  const stepRows = await db
    .select({ versionId: experimentSteps.experimentVersionId })
    .from(experimentSteps)
    .where(eq(experimentSteps.id, def.stepId))
    .limit(1);
  if (!stepRows[0] || stepRows[0].versionId !== attempt.experimentVersionId) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }

  try {
    const [created] = await db
      .insert(observations)
      .values({ attemptId: attempt.id, observationDefinitionId: definitionId, responseText })
      .returning();
    return NextResponse.json({ observation: created }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "This observation is already recorded. Edit it instead." },
        { status: 409 },
      );
    }
    logError(getRequestId(req), "Observation recording failed", error);
    return NextResponse.json({ error: "Could not record the observation." }, { status: 500 });
  }
}

/**
 * PATCH /api/attempts/[id]/observations/[observationId] (FR-STU-15).
 * Editable only while the attempt is IN_PROGRESS (FR-STU-16).
 */
export async function handleEditObservation(
  req: Request,
  attemptId: string,
  observationId: string,
): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const attempt = await ownedAttempt(student.id, attemptId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "This experiment is completed and can no longer be changed." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const responseText =
    typeof (body as Record<string, unknown>)?.responseText === "string"
      ? ((body as Record<string, unknown>).responseText as string).trim()
      : "";
  if (responseText.length === 0) {
    return NextResponse.json({ error: "Observation text is required." }, { status: 400 });
  }
  if (responseText.length > 2000) {
    return NextResponse.json(
      { error: "Observation must be 2000 characters or fewer." },
      { status: 400 },
    );
  }

  const updated = await db
    .update(observations)
    .set({ responseText, updatedAt: new Date() })
    .where(and(eq(observations.id, observationId), eq(observations.attemptId, attempt.id)))
    .returning();
  if (updated.length === 0) {
    return NextResponse.json({ error: "Observation not found." }, { status: 404 });
  }
  return NextResponse.json({ observation: updated[0] }, { status: 200 });
}
