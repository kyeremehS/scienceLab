import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentAnswers,
  assessmentQuestions,
  assessmentSubmissions,
  assessments,
  experimentAttempts,
  experimentSteps,
  observationDefinitions,
  observations,
  stepProgress,
} from "@/db/schema";
import { buildAttemptState } from "@/lib/attempts-service";
import { getRequestSession } from "@/lib/auth-service";

type AttemptRow = typeof experimentAttempts.$inferSelect;

async function requireStudent(req: Request) {
  const user = await getRequestSession(req);
  if (!user || user.role !== "STUDENT") return null;
  return user;
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

/** The assessment belonging to the attempt's experiment version. */
async function attemptAssessment(attempt: AttemptRow) {
  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.experimentVersionId, attempt.experimentVersionId))
    .limit(1);
  return rows[0] ?? null;
}

async function assessmentQuestionsFor(assessmentId: string) {
  return db
    .select()
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.questionOrder));
}

/**
 * Content-defined grading (FR-STU-23, FR-STU-24): normalized comparison
 * against the defined expected answer. AI is never the grader.
 */
export function gradeAnswer(expected: string | null, given: string): boolean {
  if (!expected) return false;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(given) === norm(expected);
}

/**
 * GET /api/attempts/[id]/assessment (FR-STU-21).
 * Authoritative questions only — expected answers and scores never leave the server.
 */
export async function handleGetAssessment(req: Request, attemptId: string): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const attempt = await ownedAttempt(student.id, attemptId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const assessment = await attemptAssessment(attempt);
  if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  const questions = await assessmentQuestionsFor(assessment.id);

  return NextResponse.json(
    {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        instructions: assessment.instructions,
        questions: questions.map((q) => ({
          id: q.id,
          order: q.questionOrder,
          type: q.type,
          questionText: q.questionText,
          options: q.options,
        })),
      },
    },
    { status: 200 },
  );
}

async function submissionJson(submissionId: string, resubmitted: boolean): Promise<NextResponse> {
  const subs = await db
    .select()
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.id, submissionId))
    .limit(1);
  const answers = await db
    .select()
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.submissionId, submissionId));
  return NextResponse.json(
    { submission: subs[0], answers, resubmitted },
    { status: 200 },
  );
}

/**
 * POST /api/attempts/[id]/assessment (FR-STU-22–FR-STU-25).
 * Validates completeness, grades per content rules, stores submission +
 * answers + result atomically. Submit-once: repeats return the stored
 * result without replacing it (idempotent safe retry, CR-06).
 */
export async function handleSubmitAssessment(req: Request, attemptId: string): Promise<NextResponse> {
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

  const existing = await db
    .select({ id: assessmentSubmissions.id })
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.attemptId, attempt.id))
    .limit(1);
  if (existing[0]) return submissionJson(existing[0].id, true);

  const assessment = await attemptAssessment(attempt);
  if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  const questions = await assessmentQuestionsFor(assessment.id);
  if (questions.length === 0) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const rawAnswers = (body as Record<string, unknown>)?.answers;
  if (!Array.isArray(rawAnswers)) {
    return NextResponse.json({ error: "Answer all questions before submitting." }, { status: 400 });
  }
  const byQuestion = new Map<string, string>();
  for (const a of rawAnswers) {
    if (typeof a !== "object" || a === null) {
      return NextResponse.json({ error: "Answer all questions before submitting." }, { status: 400 });
    }
    const { questionId, answerText } = a as Record<string, unknown>;
    if (typeof questionId !== "string" || typeof answerText !== "string" || answerText.trim().length === 0) {
      return NextResponse.json({ error: "Answer all questions before submitting." }, { status: 400 });
    }
    if (answerText.trim().length > 2000) {
      return NextResponse.json(
        { error: "Answers must be 2000 characters or fewer." },
        { status: 400 },
      );
    }
    byQuestion.set(questionId, answerText.trim());
  }
  const missing = questions.filter((q) => !byQuestion.has(q.id));
  if (missing.length > 0 || byQuestion.size !== questions.length) {
    return NextResponse.json({ error: "Answer all questions before submitting." }, { status: 400 });
  }

  const graded = questions.map((q) => ({
    questionId: q.id,
    answerText: byQuestion.get(q.id) as string,
    isCorrect: gradeAnswer(q.expectedAnswer, byQuestion.get(q.id) as string),
  }));
  const correct = graded.filter((g) => g.isCorrect).length;
  const score = (correct / questions.length).toFixed(4);
  const feedback = `You answered ${correct} of ${questions.length} question${questions.length === 1 ? "" : "s"} correctly.`;

  try {
    const created = await db.transaction(async (tx) => {
      const [submission] = await tx
        .insert(assessmentSubmissions)
        .values({ attemptId: attempt.id, score, feedback })
        .returning({ id: assessmentSubmissions.id });
      for (const g of graded) {
        await tx.insert(assessmentAnswers).values({
          submissionId: submission.id,
          questionId: g.questionId,
          answerText: g.answerText,
          isCorrect: g.isCorrect,
        });
      }
      return submission;
    });
    return submissionJson(created.id, false);
  } catch (error) {
    // Concurrent duplicate submit (CR-06): return the stored result, never replace it.
    const raced = await db
      .select({ id: assessmentSubmissions.id })
      .from(assessmentSubmissions)
      .where(eq(assessmentSubmissions.attemptId, attempt.id))
      .limit(1);
    if (raced[0]) return submissionJson(raced[0].id, true);
    console.error("Assessment submission failed:", error);
    return NextResponse.json({ error: "Could not submit the assessment." }, { status: 500 });
  }
}

type CompletionCheck = {
  stepsComplete: boolean;
  observationsComplete: boolean;
  assessmentSubmitted: boolean;
  stepsRemaining: number;
  observationsRemaining: number;
};

async function checkCompletion(attempt: AttemptRow): Promise<CompletionCheck> {
  const steps = await db
    .select({ id: experimentSteps.id })
    .from(experimentSteps)
    .where(eq(experimentSteps.experimentVersionId, attempt.experimentVersionId));
  const progress = await db
    .select({ stepId: stepProgress.experimentStepId, status: stepProgress.status })
    .from(stepProgress)
    .where(eq(stepProgress.attemptId, attempt.id));
  const completedSteps = new Set(
    progress.filter((p) => p.status === "COMPLETED").map((p) => p.stepId),
  );
  const stepsRemaining = steps.filter((s) => !completedSteps.has(s.id)).length;

  const requiredDefs = await db
    .select({ id: observationDefinitions.id })
    .from(observationDefinitions)
    .innerJoin(
      experimentSteps,
      eq(experimentSteps.id, observationDefinitions.experimentStepId),
    )
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
  const observationsRemaining = requiredDefs.filter((d) => !recordedSet.has(d.id)).length;

  const submitted = await db
    .select({ id: assessmentSubmissions.id })
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.attemptId, attempt.id))
    .limit(1);

  return {
    stepsComplete: stepsRemaining === 0,
    observationsComplete: observationsRemaining === 0,
    assessmentSubmitted: submitted.length > 0,
    stepsRemaining,
    observationsRemaining,
  };
}

/**
 * POST /api/attempts/[id]/complete (FR-STU-26–FR-STU-27).
 * Transitions IN_PROGRESS → COMPLETED only when required steps,
 * required observations, and a submitted assessment are all present.
 */
export async function handleCompleteAttempt(req: Request, attemptId: string): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const attempt = await ownedAttempt(student.id, attemptId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") {
    const state = await buildAttemptState(attempt);
    return NextResponse.json({ attempt: state, completed: true }, { status: 200 });
  }

  const check = await checkCompletion(attempt);
  if (!check.stepsComplete || !check.observationsComplete || !check.assessmentSubmitted) {
    const remaining: string[] = [];
    if (!check.stepsComplete) remaining.push(`${check.stepsRemaining} step${check.stepsRemaining === 1 ? "" : "s"}`);
    if (!check.observationsComplete) remaining.push(`${check.observationsRemaining} required observation${check.observationsRemaining === 1 ? "" : "s"}`);
    if (!check.assessmentSubmitted) remaining.push("the assessment");
    return NextResponse.json(
      {
        error: `Still needed: ${remaining.join(", ")}.`,
        remaining: {
          steps: check.stepsRemaining,
          observations: check.observationsRemaining,
          assessment: !check.assessmentSubmitted,
        },
      },
      { status: 422 },
    );
  }

  try {
    await db
      .update(experimentAttempts)
      .set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(experimentAttempts.id, attempt.id),
          eq(experimentAttempts.status, "IN_PROGRESS"),
        ),
      );
  } catch (error) {
    console.error("Attempt completion failed:", error);
    return NextResponse.json({ error: "Could not complete the experiment." }, { status: 500 });
  }

  const updated = await ownedAttempt(student.id, attemptId);
  if (!updated || updated.status !== "COMPLETED") {
    return NextResponse.json({ error: "Could not complete the experiment." }, { status: 500 });
  }
  const state = await buildAttemptState(updated);
  return NextResponse.json({ attempt: state, completed: true }, { status: 200 });
}

/**
 * GET /api/attempts/[id]/result (FR-STU-28–FR-STU-29).
 * Completion status, assessment result + feedback, answers with correctness,
 * and the read-only learning record.
 */
export async function handleGetResult(req: Request, attemptId: string): Promise<NextResponse> {
  const student = await requireStudent(req);
  if (!student) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const attempt = await ownedAttempt(student.id, attemptId);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const subs = await db
    .select()
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.attemptId, attempt.id))
    .limit(1);
  const submission = subs[0];
  if (!submission) {
    return NextResponse.json({ error: "No assessment result yet." }, { status: 404 });
  }
  const answers = await db
    .select({
      id: assessmentAnswers.id,
      answerText: assessmentAnswers.answerText,
      isCorrect: assessmentAnswers.isCorrect,
      questionText: assessmentQuestions.questionText,
      order: assessmentQuestions.questionOrder,
    })
    .from(assessmentAnswers)
    .innerJoin(assessmentQuestions, eq(assessmentQuestions.id, assessmentAnswers.questionId))
    .where(eq(assessmentAnswers.submissionId, submission.id));

  const state = await buildAttemptState(attempt);
  return NextResponse.json(
    {
      result: {
        status: attempt.status,
        completedAt: attempt.completedAt,
        score: submission.score,
        feedback: submission.feedback,
        answers: answers.sort((a, b) => a.order - b.order),
      },
      attempt: state,
    },
    { status: 200 },
  );
}
