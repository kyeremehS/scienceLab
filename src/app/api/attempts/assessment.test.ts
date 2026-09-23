import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiInteractions,
  assessmentAnswers,
  assessmentQuestions,
  assessmentSubmissions,
  assessments,
  assignments,
  classMemberships,
  classes,
  experimentAttempts,
  experimentSteps,
  experimentVersions,
  experiments,
  observationDefinitions,
  observations,
  stepProgress,
  users,
} from "@/db/schema";
import {
  gradeAnswer,
  handleCompleteAttempt,
  handleGetAssessment,
  handleGetResult,
  handleSubmitAssessment,
} from "@/lib/assessment-service";
import {
  handleCompleteStep,
  handleRecordObservation,
  handleStartExperiment,
} from "@/lib/attempts-service";
import { handleRegister } from "@/lib/auth-service";
import { handleCreateClass, handleJoinClass } from "@/lib/classes-service";
import { handleClassProgress, handleStudentProgress } from "@/lib/progress-service";
import { clearRateLimits } from "@/lib/rate-limit";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();

function authed(path: string, cookie: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), cookie },
  });
}

async function registerAs(role: "STUDENT" | "TEACHER", tag: string) {
  const email = `assess6-${tag}-${stamp}@example.com`;
  const res = await handleRegister(
    role,
    new Request(`http://localhost/api/auth/register/${role.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tag, email, password: "password123" }),
    }),
  );
  expect(res.status).toBe(201);
  const cookie = res.headers.getSetCookie()[0]?.split(";")[0] ?? "";
  const created = (await res.json()) as { user: { id: string } };
  return {
    id: created.user.id,
    authed: (path: string, init?: RequestInit) => authed(path, cookie, init),
  };
}

/** Experiment with 2 steps, 1 required def, and a 2-question assessment. */
async function makeAssessedExperiment(tag: string) {
  const [exp] = await db.insert(experiments).values({}).returning({ id: experiments.id });
  const [version] = await db
    .insert(experimentVersions)
    .values({
      experimentId: exp.id,
      versionNumber: 1,
      status: "PUBLISHED",
      title: `Phase6 test ${tag} ${stamp}`,
      description: "test",
      objectives: "test",
      materials: "test",
      safety: "test",
      durationMinutes: 10,
      difficulty: "Beginner",
      topic: "Physics",
    })
    .returning();
  const steps: { id: string }[] = [];
  for (let order = 1; order <= 2; order++) {
    const [s] = await db
      .insert(experimentSteps)
      .values({
        experimentVersionId: version.id,
        stepOrder: order,
        title: `Step ${order}`,
        instructions: `Do step ${order}.`,
      })
      .returning({ id: experimentSteps.id });
    steps.push({ id: s.id });
  }
  const [def] = await db
    .insert(observationDefinitions)
    .values({ experimentStepId: steps[0].id, displayOrder: 1, prompt: "What did you see?", required: true })
    .returning();
  const [assessment] = await db
    .insert(assessments)
    .values({ experimentVersionId: version.id, title: "Quiz", instructions: "Answer all." })
    .returning();
  const [mcq] = await db
    .insert(assessmentQuestions)
    .values({
      assessmentId: assessment.id,
      questionOrder: 1,
      type: "MULTIPLE_CHOICE",
      questionText: "Pick the second Greek letter.",
      options: ["Alpha", "Beta", "Gamma"],
      expectedAnswer: "Beta",
    })
    .returning();
  const [short] = await db
    .insert(assessmentQuestions)
    .values({
      assessmentId: assessment.id,
      questionOrder: 2,
      type: "SHORT_ANSWER",
      questionText: "Say hello.",
      options: null,
      expectedAnswer: "hello world",
    })
    .returning();
  return { experimentId: exp.id, steps, def, mcq, short };
}

async function startFor(student: { authed: (p: string, i?: RequestInit) => Request }, experimentId: string, assignmentId?: string) {
  const res = await handleStartExperiment(
    student.authed(`/api/experiments/${experimentId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignmentId ? { assignmentId } : {}),
    }),
    experimentId,
  );
  expect(res.status).toBe(201);
  const json = (await res.json()) as { attempt: { attempt: { id: string } } };
  return json.attempt.attempt.id;
}

function submitBody(answers: { questionId: string; answerText: string }[]) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  };
}

// FR-STU-21–FR-STU-30, FR-TEA-25–FR-TEA-30 end-to-end against real PostgreSQL.
describe.skipIf(!hasDb)("assessment grading rules", () => {
  it("MCQ grades by normalized exact match", () => {
    expect(gradeAnswer("Beta", "  beta ", "MULTIPLE_CHOICE")).toBe(true);
    expect(gradeAnswer("Beta", "Alpha", "MULTIPLE_CHOICE")).toBe(false);
    expect(gradeAnswer(null, "Beta", "MULTIPLE_CHOICE")).toBe(false);
  });

  it("short-answer grades by key-term overlap (FR-STU-24, DECISIONS.md §12)", () => {
    expect(gradeAnswer("hello world", "Hello  World", "SHORT_ANSWER")).toBe(true);
    expect(
      gradeAnswer(
        "LED polarity and complete connections",
        "I would check polarity and connections",
        "SHORT_ANSWER",
      ),
    ).toBe(true);
    expect(gradeAnswer("LED polarity and complete connections", "something unrelated here", "SHORT_ANSWER")).toBe(false);
    expect(gradeAnswer(null, "anything", "SHORT_ANSWER")).toBe(false);
    // Keyword-less expected answers fall back to normalized equality.
    expect(gradeAnswer("a b c", "a b c", "SHORT_ANSWER")).toBe(true);
    expect(gradeAnswer("a b c", "a b d", "SHORT_ANSWER")).toBe(false);
  });
});
describe.skipIf(!hasDb)("assessment, completion, results, progress", () => {
  afterAll(async () => {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `assess6-%-${stamp}@example.com`));
    for (const u of found) {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL session_replication_role = 'replica'`);
        const atts = await tx
          .select({ id: experimentAttempts.id })
          .from(experimentAttempts)
          .where(eq(experimentAttempts.studentId, u.id));
        for (const a of atts) {
          const subs = await tx
            .select({ id: assessmentSubmissions.id })
            .from(assessmentSubmissions)
            .where(eq(assessmentSubmissions.attemptId, a.id));
          for (const s of subs) {
            await tx.delete(assessmentAnswers).where(eq(assessmentAnswers.submissionId, s.id));
          }
          await tx.delete(assessmentSubmissions).where(eq(assessmentSubmissions.attemptId, a.id));
          await tx.delete(aiInteractions).where(eq(aiInteractions.attemptId, a.id));
          await tx.delete(observations).where(eq(observations.attemptId, a.id));
          await tx.delete(stepProgress).where(eq(stepProgress.attemptId, a.id));
        }
        await tx.delete(experimentAttempts).where(eq(experimentAttempts.studentId, u.id));
        await tx.delete(classMemberships).where(eq(classMemberships.studentId, u.id));
        const owned = await tx.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, u.id));
        for (const c of owned) {
          await tx.delete(assignments).where(eq(assignments.classId, c.id));
          await tx.delete(classMemberships).where(eq(classMemberships.classId, c.id));
          await tx.delete(classes).where(eq(classes.id, c.id));
        }
        await tx.delete(users).where(eq(users.id, u.id));
      });
    }
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL session_replication_role = 'replica'`);
      const versions = await tx
        .select({ id: experimentVersions.id })
        .from(experimentVersions)
        .where(like(experimentVersions.title, `Phase6 test % ${stamp}`));
      for (const v of versions) {
        const ass = await tx
          .select({ id: assessments.id })
          .from(assessments)
          .where(eq(assessments.experimentVersionId, v.id));
        for (const a of ass) {
          await tx.delete(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, a.id));
          await tx.delete(assessments).where(eq(assessments.id, a.id));
        }
        const vSteps = await tx
          .select({ id: experimentSteps.id })
          .from(experimentSteps)
          .where(eq(experimentSteps.experimentVersionId, v.id));
        for (const s of vSteps) {
          await tx.delete(observationDefinitions).where(eq(observationDefinitions.experimentStepId, s.id));
        }
        await tx.delete(experimentSteps).where(eq(experimentSteps.experimentVersionId, v.id));
        await tx.delete(experimentVersions).where(eq(experimentVersions.id, v.id));
      }
      const exps = await tx.select({ id: experiments.id }).from(experiments);
      for (const e of exps) {
        const remaining = await tx
          .select({ id: experimentVersions.id })
          .from(experimentVersions)
          .where(eq(experimentVersions.experimentId, e.id))
          .limit(1);
        if (remaining.length === 0) {
          const used = await tx
            .select({ id: experimentAttempts.id })
            .from(experimentAttempts)
            .where(eq(experimentAttempts.experimentId, e.id))
            .limit(1);
          if (used.length === 0) await tx.delete(experiments).where(eq(experiments.id, e.id));
        }
      }
    });
  });

  it("FR-STU-21: assessment view exposes questions but never expected answers", async () => {
    const student = await registerAs("STUDENT", "view");
    const exp = await makeAssessedExperiment("view");
    const attemptId = await startFor(student, exp.experimentId);

    const res = await handleGetAssessment(student.authed(`/api/attempts/${attemptId}/assessment`), attemptId);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      assessment: { questions: Record<string, unknown>[] };
    };
    expect(json.assessment.questions).toHaveLength(2);
    for (const q of json.assessment.questions) {
      expect(q).not.toHaveProperty("expectedAnswer");
    }
    const mcq = json.assessment.questions[0] as { options: string[] };
    expect(mcq.options).toEqual(["Alpha", "Beta", "Gamma"]);

    const intruder = await registerAs("STUDENT", "view-intr");
    expect(
      (await handleGetAssessment(intruder.authed(`/api/attempts/${attemptId}/assessment`), attemptId)).status,
    ).toBe(404);
  });

  it("FR-STU-22–24: incomplete rejected; grading per content rules", async () => {
    const student = await registerAs("STUDENT", "grade");
    const exp = await makeAssessedExperiment("grade");
    const attemptId = await startFor(student, exp.experimentId);

    const incomplete = await handleSubmitAssessment(
      student.authed(`/api/attempts/${attemptId}/assessment`, submitBody([{ questionId: exp.mcq.id, answerText: "Beta" }])),
      attemptId,
    );
    expect(incomplete.status).toBe(400);

    const submitted = await handleSubmitAssessment(
      student.authed(
        `/api/attempts/${attemptId}/assessment`,
        submitBody([
          { questionId: exp.mcq.id, answerText: "  beta " },
          { questionId: exp.short.id, answerText: "Hello  World" },
        ]),
      ),
      attemptId,
    );
    expect(submitted.status).toBe(200);
    const json = (await submitted.json()) as {
      resubmitted: boolean;
      submission: { score: string; feedback: string };
      answers: { questionId: string; isCorrect: boolean }[];
    };
    expect(json.resubmitted).toBe(false);
    expect(json.submission.score).toBe("1.0000");
    expect(json.answers.find((a) => a.questionId === exp.mcq.id)?.isCorrect).toBe(true);
  });

  it("FR-STU-23: wrong MCQ answer scores zero for that question", async () => {
    const student = await registerAs("STUDENT", "wrong");
    const exp = await makeAssessedExperiment("wrong");
    const attemptId = await startFor(student, exp.experimentId);

    const submitted = await handleSubmitAssessment(
      student.authed(
        `/api/attempts/${attemptId}/assessment`,
        submitBody([
          { questionId: exp.mcq.id, answerText: "Alpha" },
          { questionId: exp.short.id, answerText: "hello world" },
        ]),
      ),
      attemptId,
    );
    expect(submitted.status).toBe(200);
    const json = (await submitted.json()) as { submission: { score: string } };
    expect(json.submission.score).toBe("0.5000");
  });

  it("FR-STU-25: duplicate submission returns the stored result without replacing it", async () => {
    const student = await registerAs("STUDENT", "dup");
    const exp = await makeAssessedExperiment("dup");
    const attemptId = await startFor(student, exp.experimentId);
    const good = [
      { questionId: exp.mcq.id, answerText: "Beta" },
      { questionId: exp.short.id, answerText: "hello world" },
    ];
    const first = await handleSubmitAssessment(
      student.authed(`/api/attempts/${attemptId}/assessment`, submitBody(good)),
      attemptId,
    );
    expect(first.status).toBe(200);

    const [r1, r2] = await Promise.all([
      handleSubmitAssessment(student.authed(`/api/attempts/${attemptId}/assessment`, submitBody(good)), attemptId),
      handleSubmitAssessment(
        student.authed(`/api/attempts/${attemptId}/assessment`, submitBody([
          { questionId: exp.mcq.id, answerText: "Alpha" },
          { questionId: exp.short.id, answerText: "nope" },
        ])),
        attemptId,
      ),
    ]);
    for (const r of [r1, r2]) {
      expect(r.status).toBe(200);
      const json = (await r.json()) as { resubmitted: boolean; submission: { score: string } };
      expect(json.resubmitted).toBe(true);
      expect(json.submission.score).toBe("1.0000");
    }
    const rows = await db
      .select({ id: assessmentSubmissions.id })
      .from(assessmentSubmissions)
      .where(eq(assessmentSubmissions.attemptId, attemptId));
    expect(rows).toHaveLength(1);
  });

  it("FR-STU-26: completion blocked until steps, observations, and assessment are done", async () => {
    const student = await registerAs("STUDENT", "block");
    const exp = await makeAssessedExperiment("block");
    const attemptId = await startFor(student, exp.experimentId);

    const early = await handleCompleteAttempt(
      student.authed(`/api/attempts/${attemptId}/complete`, { method: "POST" }),
      attemptId,
    );
    expect(early.status).toBe(422);
    const earlyJson = (await early.json()) as {
      remaining: { steps: number; observations: number; assessment: boolean };
    };
    expect(earlyJson.remaining).toEqual({ steps: 2, observations: 1, assessment: true });
  });

  it("FR-STU-26–29: full journey — submit, complete, result, read-only review", async () => {
    const student = await registerAs("STUDENT", "full");
    const exp = await makeAssessedExperiment("full");
    const attemptId = await startFor(student, exp.experimentId);

    for (const s of exp.steps) {
      const r = await handleCompleteStep(
        student.authed(`/api/attempts/${attemptId}/steps/${s.id}/complete`, { method: "POST" }),
        attemptId,
        s.id,
      );
      expect(r.status).toBe(200);
    }
    const obs = await handleRecordObservation(
      student.authed(`/api/attempts/${attemptId}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationDefinitionId: exp.def.id, responseText: "Saw it." }),
      }),
      attemptId,
    );
    expect(obs.status).toBe(201);
    const sub = await handleSubmitAssessment(
      student.authed(
        `/api/attempts/${attemptId}/assessment`,
        submitBody([
          { questionId: exp.mcq.id, answerText: "Beta" },
          { questionId: exp.short.id, answerText: "hello world" },
        ]),
      ),
      attemptId,
    );
    expect(sub.status).toBe(200);

    const done = await handleCompleteAttempt(
      student.authed(`/api/attempts/${attemptId}/complete`, { method: "POST" }),
      attemptId,
    );
    expect(done.status).toBe(200);
    const doneJson = (await done.json()) as { completed: boolean; attempt: { attempt: { status: string } } };
    expect(doneJson.completed).toBe(true);
    expect(doneJson.attempt.attempt.status).toBe("COMPLETED");

    // Repeat complete is a safe no-op.
    const again = await handleCompleteAttempt(
      student.authed(`/api/attempts/${attemptId}/complete`, { method: "POST" }),
      attemptId,
    );
    expect(again.status).toBe(200);

    const result = await handleGetResult(student.authed(`/api/attempts/${attemptId}/result`), attemptId);
    expect(result.status).toBe(200);
    const resultJson = (await result.json()) as {
      result: { status: string; score: string; feedback: string; answers: { isCorrect: boolean }[] };
    };
    expect(resultJson.result.status).toBe("COMPLETED");
    expect(resultJson.result.score).toBe("1.0000");
    expect(resultJson.result.answers).toHaveLength(2);

    // FR-STU-27: completed records immutable through normal operations.
    expect(
      (
        await handleRecordObservation(
          student.authed(`/api/attempts/${attemptId}/observations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observationDefinitionId: exp.def.id, responseText: "Late." }),
          }),
          attemptId,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await handleSubmitAssessment(
          student.authed(`/api/attempts/${attemptId}/assessment`, submitBody([
            { questionId: exp.mcq.id, answerText: "Beta" },
            { questionId: exp.short.id, answerText: "hello world" },
          ])),
          attemptId,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await handleCompleteStep(
          student.authed(`/api/attempts/${attemptId}/steps/${exp.steps[0].id}/complete`, { method: "POST" }),
          attemptId,
          exp.steps[0].id,
        )
      ).status,
    ).toBe(409);
  });

  it("CR-05: trigger backstop refuses direct submission writes on completed attempts", async () => {
    const student = await registerAs("STUDENT", "trig");
    const exp = await makeAssessedExperiment("trig");
    const attemptId = await startFor(student, exp.experimentId);
    await db
      .update(experimentAttempts)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(experimentAttempts.id, attemptId));
    await expect(
      db.insert(assessmentSubmissions).values({ attemptId, score: "1.0000" }),
    ).rejects.toThrow();
  });

  it("FR-TEA-25–27, FR-TEA-30: class counts, student detail, isolation", async () => {
    clearRateLimits();
    const teacher = await registerAs("TEACHER", "prog-t");
    const outsiderTeacher = await registerAs("TEACHER", "prog-x");
    const studentA = await registerAs("STUDENT", "prog-a");
    const studentB = await registerAs("STUDENT", "prog-b");
    const exp = await makeAssessedExperiment("prog");

    const created = await handleCreateClass(
      teacher.authed("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Prog Class" }),
      }),
    );
    const { class: cls } = (await created.json()) as { class: { id: string; code: string } };
    for (const s of [studentA, studentB]) {
      await handleJoinClass(
        s.authed("/api/classes/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: cls.code }),
        }),
      );
    }
    const [version] = await db
      .select({ id: experimentVersions.id })
      .from(experimentVersions)
      .where(eq(experimentVersions.experimentId, exp.experimentId))
      .limit(1);
    const [assignment] = await db
      .insert(assignments)
      .values({
        classId: cls.id,
        teacherId: teacher.id,
        experimentId: exp.experimentId,
        experimentVersionId: version.id,
      })
      .returning({ id: assignments.id });

    await startFor(studentA, exp.experimentId, assignment.id);

    const progress = await handleClassProgress(
      teacher.authed(`/api/classes/${cls.id}/progress`),
      cls.id,
    );
    expect(progress.status).toBe(200);
    const pJson = (await progress.json()) as {
      progress: { counts: { total: number; notStarted: number; inProgress: number; completed: number } }[];
    };
    expect(pJson.progress).toHaveLength(1);
    expect(pJson.progress[0].counts).toEqual({ total: 2, notStarted: 1, inProgress: 1, completed: 0 });

    const detail = await handleStudentProgress(
      teacher.authed(`/api/classes/${cls.id}/students/${studentA.id}/progress`),
      cls.id,
      studentA.id,
    );
    expect(detail.status).toBe(200);
    const dJson = (await detail.json()) as {
      assigned: { status: string; stepsTotal: number }[];
      independent: unknown[];
    };
    expect(dJson.assigned).toHaveLength(1);
    expect(dJson.assigned[0].status).toBe("IN_PROGRESS");
    expect(dJson.assigned[0].stepsTotal).toBe(2);

    // Isolation: other teacher's class denied; non-member student denied.
    expect(
      (await handleClassProgress(outsiderTeacher.authed(`/api/classes/${cls.id}/progress`), cls.id)).status,
    ).toBe(404);
    const stranger = await registerAs("STUDENT", "prog-str");
    expect(
      (await handleStudentProgress(teacher.authed(`/api/classes/${cls.id}/students/${stranger.id}/progress`), cls.id, stranger.id)).status,
    ).toBe(404);
  });
});
