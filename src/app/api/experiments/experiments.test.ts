import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  experiments,
  experimentSteps,
  experimentVersions,
  users,
} from "@/db/schema";
import { handleRegister } from "@/lib/auth-service";
import { handleGetExperiment, handleListExperiments } from "@/lib/experiments-service";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();

let studentSeq = 0;

async function studentCookie(): Promise<string> {
  studentSeq += 1;
  const email = `catalog-${stamp}-${studentSeq}@example.com`;
  const res = await handleRegister(
    "STUDENT",
    new Request("http://localhost/api/auth/register/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Catalog", email, password: "password123" }),
    }),
  );
  expect(res.status).toBe(201);
  const created = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  createdIds.push(created[0].id);
  return res.headers.getSetCookie()[0]?.split(";")[0] ?? "";
}

const createdIds: string[] = [];
const createdExperimentIds: string[] = [];

// FR-STU-05 / FR-STU-06 against real PostgreSQL.
describe.skipIf(!hasDb)("experiment catalogue", () => {
  afterAll(async () => {
    for (const id of createdExperimentIds) {
      const versions = await db
        .select({ id: experimentVersions.id })
        .from(experimentVersions)
        .where(eq(experimentVersions.experimentId, id));
      for (const v of versions) {
        await db.delete(experimentSteps).where(eq(experimentSteps.experimentVersionId, v.id));
        await db.delete(experimentVersions).where(eq(experimentVersions.id, v.id));
      }
      await db.delete(experiments).where(eq(experiments.id, id));
    }
    for (const id of createdIds) {
      await db.delete(users).where(eq(users.id, id));
    }
  });

  it("lists published experiments with catalogue fields, hiding drafts", async () => {
    const cookie = await studentCookie();

    const [draft] = await db.insert(experiments).values({}).returning({ id: experiments.id });
    createdExperimentIds.push(draft.id);
    await db.insert(experimentVersions).values({
      experimentId: draft.id,
      versionNumber: 1,
      status: "DRAFT",
      title: `Draft ${stamp}`,
      description: "Hidden draft",
      objectives: "o",
      materials: "m",
      safety: "s",
      durationMinutes: 10,
      difficulty: "Beginner",
      topic: "Physics",
    });

    const res = await handleListExperiments(
      new Request("http://localhost/api/experiments", { headers: { cookie } }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      experiments: { title: string; difficulty: string; topic: string; stepCount: number }[];
    };
    expect(data.experiments.some((e) => e.title === `Draft ${stamp}`)).toBe(false);
    for (const e of data.experiments) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.difficulty.length).toBeGreaterThan(0);
      expect(e.topic.length).toBeGreaterThan(0);
      expect(typeof e.stepCount).toBe("number");
    }
  });

  it("returns pre-start details without assessment content, 404 for unknown", async () => {
    const cookie = await studentCookie();
    const listed = (await (
      await handleListExperiments(
        new Request("http://localhost/api/experiments", { headers: { cookie } }),
      )
    ).json()) as { experiments: { experimentId: string }[] };
    expect(listed.experiments.length).toBeGreaterThan(0);

    const detail = await handleGetExperiment(
      new Request("http://localhost/api/experiments/x", { headers: { cookie } }),
      listed.experiments[0].experimentId,
    );
    expect(detail.status).toBe(200);
    const body = (await detail.json()) as {
      experiment: { objectives: string; materials: string; safety: string; steps: unknown[] };
    };
    expect(body.experiment.objectives.length).toBeGreaterThan(0);
    expect(body.experiment.materials.length).toBeGreaterThan(0);
    expect(body.experiment.safety.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("expectedAnswer");

    const missing = await handleGetExperiment(
      new Request("http://localhost/api/experiments/x", { headers: { cookie } }),
      "00000000-0000-0000-0000-000000000000",
    );
    expect(missing.status).toBe(404);
  });

  it("denies unauthenticated catalogue access", async () => {
    expect((await handleListExperiments(new Request("http://localhost/api/experiments"))).status).toBe(401);
  });
});
