import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";
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
  stepProgress,
  observations,
  users,
} from "@/db/schema";
import {
  handleCloseAssignment,
  handleCreateAssignment,
  handleGetAssignment,
  handleListAssignments,
  handleUpdateAssignment,
} from "@/lib/assignments-service";
import { handleStartExperiment } from "@/lib/attempts-service";
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
  const email = `assign7-${tag}-${stamp}@example.com`;
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

async function makeVersion(tag: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED" = "PUBLISHED") {
  const [exp] = await db.insert(experiments).values({}).returning({ id: experiments.id });
  const [version] = await db
    .insert(experimentVersions)
    .values({
      experimentId: exp.id,
      versionNumber: 1,
      status,
      title: `Phase7 test ${tag} ${stamp}`,
      description: "test",
      objectives: "test",
      materials: "test",
      safety: "test",
      durationMinutes: 10,
      difficulty: "Beginner",
      topic: "Physics",
    })
    .returning();
  return { experimentId: exp.id, versionId: version.id };
}

async function makeClass(teacher: { authed: (p: string, i?: RequestInit) => Request }, name: string) {
  const res = await handleCreateClass(
    teacher.authed("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
  expect(res.status).toBe(201);
  return (await res.json()) as { class: { id: string; code: string } };
}

function createBody(experimentId: string, extra: Record<string, unknown> = {}) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ experimentId, ...extra }),
  };
}

// FR-TEA-15–FR-TEA-24 end-to-end against real PostgreSQL.
describe.skipIf(!hasDb)("teacher assignments", () => {
  afterAll(async () => {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `assign7-%-${stamp}@example.com`));
    for (const u of found) {
      const atts = await db
        .select({ id: experimentAttempts.id })
        .from(experimentAttempts)
        .where(eq(experimentAttempts.studentId, u.id));
      for (const a of atts) {
        await db.delete(observations).where(eq(observations.attemptId, a.id));
        await db.delete(stepProgress).where(eq(stepProgress.attemptId, a.id));
      }
      await db.delete(experimentAttempts).where(eq(experimentAttempts.studentId, u.id));
      await db.delete(classMemberships).where(eq(classMemberships.studentId, u.id));
      const owned = await db.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, u.id));
      for (const c of owned) {
        await db.delete(assignments).where(eq(assignments.classId, c.id));
        await db.delete(classMemberships).where(eq(classMemberships.classId, c.id));
        await db.delete(classes).where(eq(classes.id, c.id));
      }
      await db.delete(users).where(eq(users.id, u.id));
    }
    const versions = await db
      .select({ id: experimentVersions.id, experimentId: experimentVersions.experimentId })
      .from(experimentVersions)
      .where(like(experimentVersions.title, `Phase7 test % ${stamp}`));
    for (const v of versions) {
      const vSteps = await db
        .select({ id: experimentSteps.id })
        .from(experimentSteps)
        .where(eq(experimentSteps.experimentVersionId, v.id));
      for (const s of vSteps) {
        await db.delete(observationDefinitions).where(eq(observationDefinitions.experimentStepId, s.id));
      }
      await db.delete(experimentSteps).where(eq(experimentSteps.experimentVersionId, v.id));
      await db.delete(experimentVersions).where(eq(experimentVersions.id, v.id));
    }
    const exps = await db.select({ id: experiments.id }).from(experiments);
    for (const e of exps) {
      const remaining = await db
        .select({ id: experimentVersions.id })
        .from(experimentVersions)
        .where(eq(experimentVersions.experimentId, e.id))
        .limit(1);
      if (remaining.length === 0) {
        await db.delete(experiments).where(eq(experiments.id, e.id));
      }
    }
  });

  it("FR-TEA-15/18: assign locks the published version and creates no attempts", async () => {
    const teacher = await registerAs("TEACHER", "create");
    const student = await registerAs("STUDENT", "create-s");
    const exp = await makeVersion("create");
    const { class: cls } = await makeClass(teacher, "Assign Class");

    const res = await handleCreateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments`, createBody(exp.experimentId)),
      cls.id,
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      assignment: { id: string; status: string; experimentVersionId: string; experimentTitle: string };
    };
    expect(json.assignment.status).toBe("ACTIVE");
    expect(json.assignment.experimentVersionId).toBe(exp.versionId);
    expect(json.assignment.experimentTitle).toContain("Phase7 test");

    const attempts = await db
      .select({ id: experimentAttempts.id })
      .from(experimentAttempts)
      .where(eq(experimentAttempts.studentId, student.id));
    expect(attempts).toHaveLength(0);
  });

  it("FR-TEA-15/17: duplicate active refused; draft experiments rejected; roles enforced", async () => {
    const teacher = await registerAs("TEACHER", "rules");
    const otherTeacher = await registerAs("TEACHER", "rules-x");
    const student = await registerAs("STUDENT", "rules-s");
    const exp = await makeVersion("rules");
    const draft = await makeVersion("rules-draft", "DRAFT");
    const { class: cls } = await makeClass(teacher, "Rules Class");

    const first = await handleCreateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments`, createBody(exp.experimentId)),
      cls.id,
    );
    expect(first.status).toBe(201);

    const duplicate = await handleCreateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments`, createBody(exp.experimentId)),
      cls.id,
    );
    expect(duplicate.status).toBe(409);

    const draftAssign = await handleCreateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments`, createBody(draft.experimentId)),
      cls.id,
    );
    expect(draftAssign.status).toBe(404);

    expect(
      (await handleCreateAssignment(
        otherTeacher.authed(`/api/classes/${cls.id}/assignments`, createBody(exp.experimentId)),
        cls.id,
      )).status,
    ).toBe(404);
    expect(
      (await handleCreateAssignment(
        student.authed(`/api/classes/${cls.id}/assignments`, createBody(exp.experimentId)),
        cls.id,
      )).status,
    ).toBe(403);
    expect(
      (await handleListAssignments(otherTeacher.authed(`/api/classes/${cls.id}/assignments`), cls.id)).status,
    ).toBe(404);
  });

  it("FR-TEA-19/20/21: view, update dates, experiment replacement refused", async () => {
    const teacher = await registerAs("TEACHER", "dates");
    const exp = await makeVersion("dates");
    const other = await makeVersion("dates-other");
    const { class: cls } = await makeClass(teacher, "Dates Class");

    const created = await handleCreateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments`, createBody(exp.experimentId)),
      cls.id,
    );
    const { assignment } = (await created.json()) as { assignment: { id: string } };

    const viewed = await handleGetAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}`),
      cls.id,
      assignment.id,
    );
    expect(viewed.status).toBe(200);

    const updated = await handleUpdateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: "2026-12-31T23:59:00.000Z" }),
      }),
      cls.id,
      assignment.id,
    );
    expect(updated.status).toBe(200);
    expect(((await updated.json()) as { assignment: { dueAt: string } }).assignment.dueAt).toContain("2026-12-31");

    const swap = await handleUpdateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimentId: other.experimentId }),
      }),
      cls.id,
      assignment.id,
    );
    expect(swap.status).toBe(400);

    const badRange = await handleUpdateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: "2026-12-31T23:59:00.000Z", dueAt: "2026-01-01T00:00:00.000Z" }),
      }),
      cls.id,
      assignment.id,
    );
    expect(badRange.status).toBe(400);
  });

  it("FR-TEA-23/24: close preserves history and exits the assignment gate", async () => {
    const teacher = await registerAs("TEACHER", "close");
    const student = await registerAs("STUDENT", "close-s");
    const assigned = await makeVersion("close-a");
    const free = await makeVersion("close-b");
    const { class: cls } = await makeClass(teacher, "Close Class");
    await handleJoinClass(
      student.authed("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cls.code }),
      }),
    );

    const created = await handleCreateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments`, createBody(assigned.experimentId)),
      cls.id,
    );
    const { assignment } = (await created.json()) as { assignment: { id: string } };

    const blocked = await handleStartExperiment(
      student.authed(`/api/experiments/${free.experimentId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      free.experimentId,
    );
    expect(blocked.status).toBe(403);

    const closed = await handleCloseAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      }),
      cls.id,
      assignment.id,
    );
    expect(closed.status).toBe(200);
    expect(((await closed.json()) as { assignment: { status: string } }).assignment.status).toBe("CLOSED");

    // History preserved, no longer gating.
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignment.id));
    expect(rows).toHaveLength(1);
    const freed = await handleStartExperiment(
      student.authed(`/api/experiments/${free.experimentId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      free.experimentId,
    );
    expect(freed.status).toBe(201);

    // Terminal transitions: same-state idempotent, cross-terminal refused.
    const again = await handleCloseAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      }),
      cls.id,
      assignment.id,
    );
    expect(again.status).toBe(200);
    const cancelAfterClose = await handleCloseAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      }),
      cls.id,
      assignment.id,
    );
    expect(cancelAfterClose.status).toBe(409);

    // Closed assignments reject date edits.
    const editClosed = await handleUpdateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: "2026-12-31T23:59:00.000Z" }),
      }),
      cls.id,
      assignment.id,
    );
    expect(editClosed.status).toBe(409);
  });

  it("assignment keeps its locked version after a newer version publishes", async () => {
    const teacher = await registerAs("TEACHER", "stale");
    const exp = await makeVersion("stale");
    const { class: cls } = await makeClass(teacher, "Stale Class");

    const created = await handleCreateAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments`, createBody(exp.experimentId)),
      cls.id,
    );
    const { assignment } = (await created.json()) as { assignment: { id: string; experimentVersionId: string } };
    expect(assignment.experimentVersionId).toBe(exp.versionId);

    // Publish v2: archive v1 (one-published rule), insert v2.
    await db
      .update(experimentVersions)
      .set({ status: "ARCHIVED" })
      .where(eq(experimentVersions.id, exp.versionId));
    const [v2] = await db
      .insert(experimentVersions)
      .values({
        experimentId: exp.experimentId,
        versionNumber: 2,
        status: "PUBLISHED",
        title: `Phase7 test stale-v2 ${stamp}`,
        description: "test",
        objectives: "test",
        materials: "test",
        safety: "test",
        durationMinutes: 10,
        difficulty: "Beginner",
        topic: "Physics",
      })
      .returning({ id: experimentVersions.id });

    const viewed = await handleGetAssignment(
      teacher.authed(`/api/classes/${cls.id}/assignments/${assignment.id}`),
      cls.id,
      assignment.id,
    );
    expect(
      ((await viewed.json()) as { assignment: { experimentVersionId: string } }).assignment.experimentVersionId,
    ).toBe(exp.versionId);
    expect(v2.id).not.toBe(exp.versionId);
  });
});
