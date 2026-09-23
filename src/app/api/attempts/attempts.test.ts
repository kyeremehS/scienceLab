import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import {
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
  handleCompleteStep,
  handleEditObservation,
  handleGetAttempt,
  handleRecordObservation,
  handleStartExperiment,
} from "@/lib/attempts-service";
import { handleRegister } from "@/lib/auth-service";
import { handleCreateClass, handleJoinClass } from "@/lib/classes-service";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();

function authed(path: string, cookie: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), cookie },
  });
}

async function registerAs(role: "STUDENT" | "TEACHER", tag: string) {
  const email = `attempt-${tag}-${stamp}@example.com`;
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

/** Minimal published experiment package: 3 steps, defs on steps 1 and 3. */
async function makeExperiment(tag: string) {
  const [exp] = await db.insert(experiments).values({}).returning({ id: experiments.id });
  const [version] = await db
    .insert(experimentVersions)
    .values({
      experimentId: exp.id,
      versionNumber: 1,
      status: "PUBLISHED",
      title: `Attempt test ${tag} ${stamp}`,
      description: "test",
      objectives: "test",
      materials: "test",
      safety: "test",
      durationMinutes: 10,
      difficulty: "Beginner",
      topic: "Physics",
    })
    .returning();
  const steps: { id: string; order: number }[] = [];
  for (let order = 1; order <= 3; order++) {
    const [s] = await db
      .insert(experimentSteps)
      .values({
        experimentVersionId: version.id,
        stepOrder: order,
        title: `Step ${order}`,
        instructions: `Do step ${order}.`,
      })
      .returning({ id: experimentSteps.id });
    steps.push({ id: s.id, order });
  }
  const [req1] = await db
    .insert(observationDefinitions)
    .values({ experimentStepId: steps[0].id, displayOrder: 1, prompt: "What did you see?", required: true })
    .returning();
  const [opt3] = await db
    .insert(observationDefinitions)
    .values({ experimentStepId: steps[2].id, displayOrder: 1, prompt: "Optional note?", required: false })
    .returning();
  return { experimentId: exp.id, versionId: version.id, steps, req1, opt3 };
}

function startBody(assignmentId?: string) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assignmentId ? { assignmentId } : {}) };
}

// FR-STU-07–FR-STU-16 end-to-end against real PostgreSQL.
describe.skipIf(!hasDb)("attempts, steps, and observations", () => {
  // Cleanup runs with triggers disabled: the trigger-backstop test leaves a
  // COMPLETED attempt whose rows the immutability triggers would otherwise
  // protect even from test teardown. SET LOCAL keeps this to the transaction.
  afterAll(async () => {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `attempt-%-${stamp}@example.com`));
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
        .where(like(experimentVersions.title, `Attempt test % ${stamp}`));
      for (const v of versions) {
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
      // Remove test experiments left with no versions (seed content untouched).
      const exps = await tx.select({ id: experiments.id }).from(experiments);
      for (const e of exps) {
        const remaining = await tx
          .select({ id: experimentVersions.id })
          .from(experimentVersions)
          .where(eq(experimentVersions.experimentId, e.id))
          .limit(1);
        const used = await tx
          .select({ id: experimentAttempts.id })
          .from(experimentAttempts)
          .where(eq(experimentAttempts.experimentId, e.id))
          .limit(1);
        if (remaining.length === 0 && used.length === 0) {
          await tx.delete(experiments).where(eq(experiments.id, e.id));
        }
      }
    });
  });

  it("FR-STU-08/09: start creates an IN_PROGRESS attempt; second start resumes it", async () => {
    const student = await registerAs("STUDENT", "start");
    const exp = await makeExperiment("start");

    const first = await handleStartExperiment(
      student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    expect(first.status).toBe(201);
    const firstJson = (await first.json()) as {
      resumed: boolean;
      attempt: { attempt: { id: string; status: string }; progress: { currentStepId: string | null } };
    };
    expect(firstJson.resumed).toBe(false);
    expect(firstJson.attempt.attempt.status).toBe("IN_PROGRESS");
    expect(firstJson.attempt.progress.currentStepId).toBe(exp.steps[0].id);

    const second = await handleStartExperiment(
      student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    expect(second.status).toBe(200);
    const secondJson = (await second.json()) as {
      resumed: boolean;
      attempt: { attempt: { id: string } };
    };
    expect(secondJson.resumed).toBe(true);
    expect(secondJson.attempt.attempt.id).toBe(firstJson.attempt.attempt.id);
  });

  it("FR-STU-07: gate blocks independent starts while assigned work is incomplete", async () => {
    const teacher = await registerAs("TEACHER", "gate-t");
    const student = await registerAs("STUDENT", "gate-s");
    const assigned = await makeExperiment("assigned");
    const free = await makeExperiment("free");

    const created = await handleCreateClass(
      teacher.authed("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Gate Class" }),
      }),
    );
    expect(created.status).toBe(201);
    const { class: cls } = (await created.json()) as { class: { id: string; code: string } };
    const joined = await handleJoinClass(
      student.authed("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cls.code }),
      }),
    );
    expect(joined.status).toBe(201);

    // Assignments table is persistence-only in Phase 4: insert directly.
    const [assignment] = await db
      .insert(assignments)
      .values({
        classId: cls.id,
        teacherId: teacher.id,
        experimentId: assigned.experimentId,
        experimentVersionId: assigned.versionId,
      })
      .returning();

    const blocked = await handleStartExperiment(
      student.authed(`/api/experiments/${free.experimentId}/start`, startBody()),
      free.experimentId,
    );
    expect(blocked.status).toBe(403);

    // Assigned work itself stays startable through the assignment.
    const assignedStart = await handleStartExperiment(
      student.authed(`/api/experiments/${assigned.experimentId}/start`, startBody(assignment.id)),
      assigned.experimentId,
    );
    expect(assignedStart.status).toBe(201);
    const assignedJson = (await assignedStart.json()) as {
      attempt: { attempt: { experimentVersionId: string; assignmentId: string | null } };
    };
    expect(assignedJson.attempt.attempt.experimentVersionId).toBe(assigned.versionId);
    expect(assignedJson.attempt.attempt.assignmentId).toBe(assignment.id);

    // Closing the assignment lifts the gate.
    await db.update(assignments).set({ status: "CLOSED" }).where(eq(assignments.id, assignment.id));
    const freed = await handleStartExperiment(
      student.authed(`/api/experiments/${free.experimentId}/start`, startBody()),
      free.experimentId,
    );
    expect(freed.status).toBe(201);
  });

  it("FR-STU-07: gate applies across multiple classes", async () => {
    const teacher = await registerAs("TEACHER", "multi-t");
    const student = await registerAs("STUDENT", "multi-s");
    const expA = await makeExperiment("multi-a");
    const expB = await makeExperiment("multi-b");

    for (const name of ["Multi A", "Multi B"]) {
      const created = await handleCreateClass(
        teacher.authed("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      );
      const { class: cls } = (await created.json()) as { class: { id: string; code: string } };
      await handleJoinClass(
        student.authed("/api/classes/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: cls.code }),
        }),
      );
      const target = name === "Multi A" ? expA : expB;
      await db.insert(assignments).values({
        classId: cls.id,
        teacherId: teacher.id,
        experimentId: target.experimentId,
        experimentVersionId: target.versionId,
      });
    }

    const blocked = await handleStartExperiment(
      student.authed(`/api/experiments/${expA.experimentId}/start`, startBody()),
      expA.experimentId,
    );
    // Independent start of expA is blocked by the expB assignment (and vice versa).
    expect(blocked.status).toBe(403);
  });

  it("CR-06: concurrent duplicate starts yield exactly one attempt", async () => {
    const student = await registerAs("STUDENT", "race");
    const exp = await makeExperiment("race");

    const [r1, r2] = await Promise.all([
      handleStartExperiment(student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()), exp.experimentId),
      handleStartExperiment(student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()), exp.experimentId),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 201]);
    const j1 = (await r1.json()) as { attempt: { attempt: { id: string } } };
    const j2 = (await r2.json()) as { attempt: { attempt: { id: string } } };
    expect(j1.attempt.attempt.id).toBe(j2.attempt.attempt.id);
    const rows = await db
      .select({ id: experimentAttempts.id })
      .from(experimentAttempts)
      .where(
        and(
          eq(experimentAttempts.studentId, student.id),
          eq(experimentAttempts.experimentId, exp.experimentId),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("FR-STU-10–13: sequential progression; skip rejected even via direct call", async () => {
    const student = await registerAs("STUDENT", "steps");
    const exp = await makeExperiment("steps");
    const started = await handleStartExperiment(
      student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    const { attempt } = (await started.json()) as { attempt: { attempt: { id: string } } };
    const attemptId = attempt.attempt.id;

    const skip = await handleCompleteStep(
      student.authed(`/api/attempts/${attemptId}/steps/${exp.steps[2].id}/complete`, { method: "POST" }),
      attemptId,
      exp.steps[2].id,
    );
    expect(skip.status).toBe(422);

    const first = await handleCompleteStep(
      student.authed(`/api/attempts/${attemptId}/steps/${exp.steps[0].id}/complete`, { method: "POST" }),
      attemptId,
      exp.steps[0].id,
    );
    expect(first.status).toBe(200);
    const firstJson = (await first.json()) as {
      attempt: { steps: { id: string; status: string }[]; progress: { currentStepId: string } };
    };
    expect(firstJson.attempt.steps.find((s) => s.id === exp.steps[0].id)?.status).toBe("COMPLETED");
    expect(firstJson.attempt.progress.currentStepId).toBe(exp.steps[1].id);

    // Backward review does not un-complete: step 1 stays COMPLETED after step 2 completes.
    const second = await handleCompleteStep(
      student.authed(`/api/attempts/${attemptId}/steps/${exp.steps[1].id}/complete`, { method: "POST" }),
      attemptId,
      exp.steps[1].id,
    );
    expect(second.status).toBe(200);
    const secondJson = (await second.json()) as {
      attempt: { steps: { id: string; status: string }[] };
    };
    expect(secondJson.attempt.steps.find((s) => s.id === exp.steps[0].id)?.status).toBe("COMPLETED");

    // Re-completing an already-completed step is idempotent success.
    const repeat = await handleCompleteStep(
      student.authed(`/api/attempts/${attemptId}/steps/${exp.steps[0].id}/complete`, { method: "POST" }),
      attemptId,
      exp.steps[0].id,
    );
    expect(repeat.status).toBe(200);
  });

  it("FR-STU-14–16: record, refuse duplicate, edit while active", async () => {
    const student = await registerAs("STUDENT", "obs");
    const exp = await makeExperiment("obs");
    const started = await handleStartExperiment(
      student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    const { attempt } = (await started.json()) as { attempt: { attempt: { id: string } } };
    const attemptId = attempt.attempt.id;

    const recorded = await handleRecordObservation(
      student.authed(`/api/attempts/${attemptId}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationDefinitionId: exp.req1.id, responseText: "The bulb lit." }),
      }),
      attemptId,
    );
    expect(recorded.status).toBe(201);

    const duplicate = await handleRecordObservation(
      student.authed(`/api/attempts/${attemptId}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationDefinitionId: exp.req1.id, responseText: "Again." }),
      }),
      attemptId,
    );
    expect(duplicate.status).toBe(409);

    const { observation } = (await recorded.json()) as { observation: { id: string } };
    const edited = await handleEditObservation(
      student.authed(`/api/attempts/${attemptId}/observations/${observation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseText: "The bulb lit brightly." }),
      }),
      attemptId,
      observation.id,
    );
    expect(edited.status).toBe(200);

    // Definition from another experiment is rejected.
    const other = await makeExperiment("obs-other");
    const foreign = await handleRecordObservation(
      student.authed(`/api/attempts/${attemptId}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationDefinitionId: other.req1.id, responseText: "Cross-linked." }),
      }),
      attemptId,
    );
    expect(foreign.status).toBe(404);
  });

  it("FR-STU-31: students cannot touch another student's attempt", async () => {
    const owner = await registerAs("STUDENT", "owner");
    const intruder = await registerAs("STUDENT", "intruder");
    const exp = await makeExperiment("isolated");
    const started = await handleStartExperiment(
      owner.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    const { attempt } = (await started.json()) as { attempt: { attempt: { id: string } } };

    expect((await handleGetAttempt(intruder.authed(`/api/attempts/${attempt.attempt.id}`), attempt.attempt.id)).status).toBe(404);
    expect(
      (
        await handleCompleteStep(
          intruder.authed(`/api/attempts/${attempt.attempt.id}/steps/${exp.steps[0].id}/complete`, { method: "POST" }),
          attempt.attempt.id,
          exp.steps[0].id,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleRecordObservation(
          intruder.authed(`/api/attempts/${attempt.attempt.id}/observations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observationDefinitionId: exp.req1.id, responseText: "Mine now." }),
          }),
          attempt.attempt.id,
        )
      ).status,
    ).toBe(404);
  });

  it("CR-07: progress persists — GET resumes the stored state", async () => {
    const student = await registerAs("STUDENT", "resume");
    const exp = await makeExperiment("resume");
    const started = await handleStartExperiment(
      student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    const { attempt } = (await started.json()) as { attempt: { attempt: { id: string } } };
    await handleCompleteStep(
      student.authed(`/api/attempts/${attempt.attempt.id}/steps/${exp.steps[0].id}/complete`, { method: "POST" }),
      attempt.attempt.id,
      exp.steps[0].id,
    );
    await handleRecordObservation(
      student.authed(`/api/attempts/${attempt.attempt.id}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationDefinitionId: exp.req1.id, responseText: "Persisted." }),
      }),
      attempt.attempt.id,
    );

    const resumed = await handleGetAttempt(
      student.authed(`/api/attempts/${attempt.attempt.id}`),
      attempt.attempt.id,
    );
    expect(resumed.status).toBe(200);
    const json = (await resumed.json()) as {
      attempt: {
        steps: { id: string; status: string; observations: { responseText: string | null }[] }[];
        progress: { completedSteps: number; currentStepId: string; requiredObservationsRecorded: number };
      };
    };
    expect(json.attempt.steps.find((s) => s.id === exp.steps[0].id)?.status).toBe("COMPLETED");
    expect(json.attempt.progress.currentStepId).toBe(exp.steps[1].id);
    expect(json.attempt.progress.requiredObservationsRecorded).toBe(1);
  });

  it("CR-05: trigger backstop refuses direct writes to completed attempts", async () => {
    const student = await registerAs("STUDENT", "trigger");
    const exp = await makeExperiment("trigger");
    const started = await handleStartExperiment(
      student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    const { attempt } = (await started.json()) as { attempt: { attempt: { id: string } } };

    // Service layer refuses first…
    await db
      .update(experimentAttempts)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(experimentAttempts.id, attempt.attempt.id));
    const refused = await handleRecordObservation(
      student.authed(`/api/attempts/${attempt.attempt.id}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationDefinitionId: exp.req1.id, responseText: "Too late." }),
      }),
      attempt.attempt.id,
    );
    expect(refused.status).toBe(409);

    // …and the database trigger blocks paths that bypass the service.
    await expect(
      db.insert(observations).values({
        attemptId: attempt.attempt.id,
        observationDefinitionId: exp.req1.id,
        responseText: "Bypass attempt.",
      }),
    ).rejects.toThrow();
    await expect(
      db
        .update(experimentAttempts)
        .set({ updatedAt: new Date() })
        .where(eq(experimentAttempts.id, attempt.attempt.id)),
    ).rejects.toThrow();
    await expect(
      db.delete(experimentAttempts).where(eq(experimentAttempts.id, attempt.attempt.id)),
    ).rejects.toThrow();
  });

  it("CR-05: trigger permits DELETE of an IN_PROGRESS attempt (cleanup path)", async () => {
    const student = await registerAs("STUDENT", "delete-ok");
    const exp = await makeExperiment("delete-ok");
    const started = await handleStartExperiment(
      student.authed(`/api/experiments/${exp.experimentId}/start`, startBody()),
      exp.experimentId,
    );
    const { attempt } = (await started.json()) as { attempt: { attempt: { id: string } } };
    await db.delete(stepProgress).where(eq(stepProgress.attemptId, attempt.attempt.id));
    await db.delete(experimentAttempts).where(eq(experimentAttempts.id, attempt.attempt.id));
    const remaining = await db
      .select({ id: experimentAttempts.id })
      .from(experimentAttempts)
      .where(eq(experimentAttempts.id, attempt.attempt.id));
    expect(remaining).toHaveLength(0);
  });
});
