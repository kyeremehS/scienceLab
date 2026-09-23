import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentSubmissions,
  assignments,
  classMemberships,
  classes,
  experimentAttempts,
  experimentSteps,
  experimentVersions,
  observationDefinitions,
  observations,
  stepProgress,
  users,
} from "@/db/schema";
import { getRequestSession } from "@/lib/auth-service";

async function requireTeacher(req: Request) {
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

async function activeMembers(classId: string) {
  return db
    .select({
      studentId: classMemberships.studentId,
      studentName: users.name,
      joinedAt: classMemberships.joinedAt,
    })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.studentId))
    .where(and(eq(classMemberships.classId, classId), eq(classMemberships.active, true)));
}

async function activeAssignments(classId: string) {
  return db
    .select({
      id: assignments.id,
      experimentId: assignments.experimentId,
      title: experimentVersions.title,
      dueAt: assignments.dueAt,
    })
    .from(assignments)
    .innerJoin(experimentVersions, eq(experimentVersions.id, assignments.experimentVersionId))
    .where(and(eq(assignments.classId, classId), eq(assignments.status, "ACTIVE")));
}

type AttemptStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

async function studentExperimentStatus(studentId: string, experimentId: string): Promise<{
  status: AttemptStatus;
  attemptId: string | null;
  completedAt: Date | null;
}> {
  const rows = await db
    .select({
      id: experimentAttempts.id,
      status: experimentAttempts.status,
      completedAt: experimentAttempts.completedAt,
    })
    .from(experimentAttempts)
    .where(
      and(
        eq(experimentAttempts.studentId, studentId),
        eq(experimentAttempts.experimentId, experimentId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { status: "NOT_STARTED", attemptId: null, completedAt: null };
  return { status: row.status, attemptId: row.id, completedAt: row.completedAt };
}

/**
 * GET /api/classes/[id]/progress (FR-TEA-25, FR-TEA-30).
 * Per-assigned-experiment counts derived from student learning state.
 */
export async function handleClassProgress(req: Request, classId: string): Promise<NextResponse> {
  const teacher = await requireTeacher(req);
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const row = await ownedClass(teacher.id, classId);
  if (!row) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const members = await activeMembers(classId);
  const assigned = await activeAssignments(classId);

  const progress = await Promise.all(
    assigned.map(async (a) => {
      let notStarted = 0;
      let inProgress = 0;
      let completed = 0;
      for (const m of members) {
        const s = await studentExperimentStatus(m.studentId, a.experimentId);
        if (s.status === "COMPLETED") completed += 1;
        else if (s.status === "IN_PROGRESS") inProgress += 1;
        else notStarted += 1;
      }
      return {
        assignmentId: a.id,
        experimentId: a.experimentId,
        title: a.title,
        dueAt: a.dueAt,
        counts: { total: members.length, notStarted, inProgress, completed },
      };
    }),
  );

  return NextResponse.json({ class: { id: row.id, name: row.name }, progress }, { status: 200 });
}

async function attemptDetail(studentId: string, experimentId: string, title: string) {
  const rows = await db
    .select()
    .from(experimentAttempts)
    .where(
      and(
        eq(experimentAttempts.studentId, studentId),
        eq(experimentAttempts.experimentId, experimentId),
      ),
    )
    .limit(1);
  const attempt = rows[0];
  if (!attempt) {
    return { experimentId, title, status: "NOT_STARTED" as AttemptStatus, stepsCompleted: 0, stepsTotal: 0, requiredObservationsRecorded: 0, requiredObservationsTotal: 0, score: null as string | null, completedAt: null as Date | null };
  }
  const steps = await db
    .select({ id: experimentSteps.id })
    .from(experimentSteps)
    .where(eq(experimentSteps.experimentVersionId, attempt.experimentVersionId));
  const prog = await db
    .select({ stepId: stepProgress.experimentStepId, status: stepProgress.status })
    .from(stepProgress)
    .where(eq(stepProgress.attemptId, attempt.id));
  const doneSteps = prog.filter((p) => p.status === "COMPLETED").length;

  const requiredDefs = await db
    .select({ id: observationDefinitions.id })
    .from(observationDefinitions)
    .innerJoin(experimentSteps, eq(experimentSteps.id, observationDefinitions.experimentStepId))
    .where(
      and(
        eq(experimentSteps.experimentVersionId, attempt.experimentVersionId),
        eq(observationDefinitions.required, true),
      ),
    );
  const recorded = await db
    .select({ definitionId: observations.observationDefinitionId })
    .from(observations)
    .where(eq(observations.attemptId, attempt.id));
  const recordedSet = new Set(recorded.map((r) => r.definitionId));

  const subs = await db
    .select({ score: assessmentSubmissions.score })
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.attemptId, attempt.id))
    .limit(1);

  return {
    experimentId,
    title,
    status: attempt.status as AttemptStatus,
    stepsCompleted: doneSteps,
    stepsTotal: steps.length,
    requiredObservationsRecorded: requiredDefs.filter((d) => recordedSet.has(d.id)).length,
    requiredObservationsTotal: requiredDefs.length,
    score: subs[0]?.score ?? null,
    completedAt: attempt.completedAt,
  };
}

/**
 * GET /api/classes/[id]/students/[studentId]/progress
 * (FR-TEA-26, FR-TEA-27, FR-TEA-28, FR-TEA-30). Read-only monitoring within
 * the teacher's own classes, including the student's independent work.
 */
export async function handleStudentProgress(
  req: Request,
  classId: string,
  studentId: string,
): Promise<NextResponse> {
  const teacher = await requireTeacher(req);
  if (!teacher) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const row = await ownedClass(teacher.id, classId);
  if (!row) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const membership = await db
    .select({ studentName: users.name })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.studentId))
    .where(
      and(
        eq(classMemberships.classId, classId),
        eq(classMemberships.studentId, studentId),
        eq(classMemberships.active, true),
      ),
    )
    .limit(1);
  if (membership.length === 0) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const assigned = await activeAssignments(classId);
  const assignedIds = new Set(assigned.map((a) => a.experimentId));
  const assignedProgress = await Promise.all(
    assigned.map((a) => attemptDetail(studentId, a.experimentId, a.title)),
  );

  // Independent work: attempts for experiments with no active assignment here.
  const attempts = await db
    .select({
      experimentId: experimentAttempts.experimentId,
      versionId: experimentAttempts.experimentVersionId,
    })
    .from(experimentAttempts)
    .where(eq(experimentAttempts.studentId, studentId));
  const independent: Awaited<ReturnType<typeof attemptDetail>>[] = [];
  for (const a of attempts) {
    if (assignedIds.has(a.experimentId)) continue;
    const vRows = await db
      .select({ title: experimentVersions.title })
      .from(experimentVersions)
      .where(eq(experimentVersions.id, a.versionId))
      .limit(1);
    independent.push(await attemptDetail(studentId, a.experimentId, vRows[0]?.title ?? "Experiment"));
  }

  return NextResponse.json(
    {
      student: { id: studentId, name: membership[0].studentName },
      class: { id: row.id, name: row.name },
      assigned: assignedProgress,
      independent,
    },
    { status: 200 },
  );
}
