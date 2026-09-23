import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentQuestions,
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
import { handleCreateAssignment } from "@/lib/assignments-service";
import { handleStartExperiment } from "@/lib/attempts-service";
import { handleRegister } from "@/lib/auth-service";
import { handleCreateClass } from "@/lib/classes-service";
import { handleCreateExperiment } from "@/lib/experiment-creation-service";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();

function authed(path: string, cookie: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), cookie },
  });
}

async function registerAs(role: "STUDENT" | "TEACHER", tag: string) {
  const email = `expcreate-${tag}-${stamp}@example.com`;
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
  return { authed: (path: string, init?: RequestInit) => authed(path, cookie, init) };
}

function validPackage(overrides: Record<string, unknown> = {}) {
  return {
    title: "Teacher Magnetism",
    description: "Explore magnets.",
    objectives: "Understand poles.",
    materials: "Magnets\nIron filings",
    safety: "Keep magnets from devices.",
    durationMinutes: 30,
    difficulty: "Beginner",
    topic: "Physics",
    steps: [
      {
        title: "Feel the poles",
        instructions: "Bring two magnets together both ways.",
        observations: [{ prompt: "What did you feel?", required: true }],
      },
    ],
    assessment: {
      title: "Magnetism Quiz",
      instructions: "Answer all.",
      questions: [
        {
          type: "MULTIPLE_CHOICE",
          questionText: "Like poles do what?",
          options: ["Attract", "Repel"],
          expectedAnswer: "Repel",
        },
        {
          type: "SHORT_ANSWER",
          questionText: "Name one magnetic material.",
          expectedAnswer: "iron",
        },
      ],
    },
    ...overrides,
  };
}

function postPackage(pkg: Record<string, unknown>) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pkg),
  };
}

// FR-TEA-31 end-to-end against real PostgreSQL.
describe.skipIf(!hasDb)("teacher experiment creation", () => {
  afterAll(async () => {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `expcreate-%-${stamp}@example.com`));
    for (const u of found) {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL session_replication_role = 'replica'`);
        const atts = await tx
          .select({ id: experimentAttempts.id })
          .from(experimentAttempts)
          .where(eq(experimentAttempts.studentId, u.id));
        for (const a of atts) {
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
        .where(like(experimentVersions.title, `Teacher Magnetism%`));
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
          await tx.delete(experiments).where(eq(experiments.id, e.id));
        }
      }
    });
  });

  it("FR-TEA-31: teacher creates a complete published package atomically", async () => {
    const teacher = await registerAs("TEACHER", "mk");
    const res = await handleCreateExperiment(
      teacher.authed("/api/experiments", postPackage(validPackage())),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { experiment: { experimentId: string; versionId: string } };

    const versions = await db
      .select()
      .from(experimentVersions)
      .where(eq(experimentVersions.id, json.experiment.versionId));
    expect(versions[0].status).toBe("PUBLISHED");
    expect(versions[0].versionNumber).toBe(1);
    const steps = await db
      .select()
      .from(experimentSteps)
      .where(eq(experimentSteps.experimentVersionId, json.experiment.versionId));
    expect(steps).toHaveLength(1);
    const defs = await db.select().from(observationDefinitions);
    expect(defs.filter((d) => d.experimentStepId === steps[0].id)).toHaveLength(1);
    const ass = await db
      .select()
      .from(assessments)
      .where(eq(assessments.experimentVersionId, json.experiment.versionId));
    expect(ass).toHaveLength(1);
    const qs = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, ass[0].id));
    expect(qs).toHaveLength(2);
  });

  it("FR-TEA-31: validation rejects malformed packages without partial rows", async () => {
    const teacher = await registerAs("TEACHER", "bad");
    const before = await db.select({ id: experiments.id }).from(experiments);

    const cases: Record<string, unknown>[] = [
      validPackage({ title: "" }),
      validPackage({ steps: [] }),
      validPackage({ durationMinutes: 0 }),
      validPackage({
        assessment: {
          title: "Q",
          instructions: "A",
          questions: [{ type: "MULTIPLE_CHOICE", questionText: "Q?", options: ["Only"], expectedAnswer: "Only" }],
        },
      }),
      validPackage({
        assessment: {
          title: "Q",
          instructions: "A",
          questions: [{ type: "MULTIPLE_CHOICE", questionText: "Q?", options: ["A", "B"], expectedAnswer: "C" }],
        },
      }),
      validPackage({
        assessment: {
          title: "Q",
          instructions: "A",
          questions: [{ type: "SHORT_ANSWER", questionText: "Q?", expectedAnswer: "" }],
        },
      }),
    ];
    for (const pkg of cases) {
      const res = await handleCreateExperiment(teacher.authed("/api/experiments", postPackage(pkg)));
      expect(res.status).toBe(400);
    }
    const after = await db.select({ id: experiments.id }).from(experiments);
    expect(after.length).toBe(before.length);
  });

  it("FR-TEA-31: students cannot create; created content is assignable and startable", async () => {
    const teacher = await registerAs("TEACHER", "flow");
    const student = await registerAs("STUDENT", "flow-s");
    const created = await handleCreateExperiment(
      teacher.authed("/api/experiments", postPackage(validPackage())),
    );
    expect(created.status).toBe(201);
    const { experiment } = (await created.json()) as { experiment: { experimentId: string } };

    const forbidden = await handleCreateExperiment(
      student.authed("/api/experiments", postPackage(validPackage())),
    );
    expect(forbidden.status).toBe(403);

    const clsRes = await handleCreateClassForTest(teacher, "Flow Class");
    const assignRes = await handleCreateAssignment(
      teacher.authed(`/api/classes/${clsRes.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimentId: experiment.experimentId }),
      }),
      clsRes.id,
    );
    expect(assignRes.status).toBe(201);

    const start = await handleStartExperiment(
      student.authed(`/api/experiments/${experiment.experimentId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      experiment.experimentId,
    );
    expect(start.status).toBe(201);
  });
});

async function handleCreateClassForTest(
  teacher: { authed: (p: string, i?: RequestInit) => Request },
  name: string,
) {
  const res = await handleCreateClass(
    teacher.authed("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
  expect(res.status).toBe(201);
  return ((await res.json()) as { class: { id: string; code: string } }).class;
}
