import "dotenv/config";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiInteractions,
  experimentAttempts,
  experimentSteps,
  experimentVersions,
  experiments,
  observationDefinitions,
  observations,
  stepProgress,
  users,
} from "@/db/schema";
import { handleAiAssist } from "@/lib/ai-service";
import { handleStartExperiment } from "@/lib/attempts-service";
import { handleRegister } from "@/lib/auth-service";
import { clearRateLimits } from "@/lib/rate-limit";

const hasDb = Boolean(process.env.DATABASE_URL);
const stamp = Date.now();
const REAL_KEY = process.env.OPENROUTER_API_KEY;

function authed(path: string, cookie: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), cookie },
  });
}

async function registerAs(role: "STUDENT" | "TEACHER", tag: string) {
  const email = `aiassist-${tag}-${stamp}@example.com`;
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

async function makeExperiment(tag: string) {
  const [exp] = await db.insert(experiments).values({}).returning({ id: experiments.id });
  const [version] = await db
    .insert(experimentVersions)
    .values({
      experimentId: exp.id,
      versionNumber: 1,
      status: "PUBLISHED",
      title: `AI assist test ${tag} ${stamp}`,
      description: "test",
      objectives: "test",
      materials: "battery, LED",
      safety: "test",
      durationMinutes: 10,
      difficulty: "Beginner",
      topic: "Physics",
    })
    .returning();
  const [step] = await db
    .insert(experimentSteps)
    .values({
      experimentVersionId: version.id,
      stepOrder: 1,
      title: "Connect LED",
      instructions: "Connect the LED with correct polarity.",
    })
    .returning();
  return { experimentId: exp.id, stepId: step.id };
}

async function startFor(student: { authed: (p: string, i?: RequestInit) => Request }, experimentId: string) {
  const res = await handleStartExperiment(
    student.authed(`/api/experiments/${experimentId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    experimentId,
  );
  expect(res.status).toBe(201);
  const json = (await res.json()) as { attempt: { attempt: { id: string } } };
  return json.attempt.attempt.id;
}

function askBody(extra: Record<string, unknown> = {}) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "My LED isn't lighting.", ...extra }),
  };
}

function mockCompletion(content: string) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

// FR-STU-17–FR-STU-20 end-to-end against real PostgreSQL (AI HTTP stubbed).
describe.skipIf(!hasDb)("ai assistance", () => {
  beforeEach(() => {
    clearRateLimits();
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (REAL_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = REAL_KEY;
    // One test leaves a COMPLETED attempt; its trigger backstops would block
    // even teardown deletes, so cleanup runs with triggers disabled.
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `aiassist-%-${stamp}@example.com`));
    for (const u of found) {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL session_replication_role = 'replica'`);
        const atts = await tx
          .select({ id: experimentAttempts.id })
          .from(experimentAttempts)
          .where(eq(experimentAttempts.studentId, u.id));
        for (const a of atts) {
          await tx.delete(aiInteractions).where(eq(aiInteractions.attemptId, a.id));
          await tx.delete(observations).where(eq(observations.attemptId, a.id));
          await tx.delete(stepProgress).where(eq(stepProgress.attemptId, a.id));
        }
        await tx.delete(experimentAttempts).where(eq(experimentAttempts.studentId, u.id));
        await tx.delete(users).where(eq(users.id, u.id));
      });
    }
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL session_replication_role = 'replica'`);
      const versions = await tx
        .select({ id: experimentVersions.id })
        .from(experimentVersions)
        .where(like(experimentVersions.title, `AI assist test % ${stamp}`));
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

  it("FR-STU-17/18: contextual response is returned and the interaction is logged", async () => {
    const student = await registerAs("STUDENT", "help");
    const exp = await makeExperiment("help");
    const attemptId = await startFor(student, exp.experimentId);

    const fetchMock = mockCompletion("Check the LED polarity first.");
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleAiAssist(
      student.authed(`/api/attempts/${attemptId}/assist`, askBody({ experimentStepId: exp.stepId })),
      attemptId,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { response: string; fallback: boolean };
    expect(json.fallback).toBe(false);
    expect(json.response).toBe("Check the LED polarity first.");

    // Request carried authoritative context, not personal data.
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("openrouter.ai");
    const sent = JSON.parse(init.body as string) as {
      model: string;
      messages: { role: string; content: string }[];
    };
    expect(sent.model).toBe(process.env.AI_MODEL ?? "thinkingmachines/inkling-small");
    const combined = sent.messages.map((m) => m.content).join("\n");
    expect(combined).toContain("Connect the LED with correct polarity.");
    expect(combined).toContain("battery, LED");
    expect(combined).toContain("My LED isn't lighting.");
    expect(combined).not.toContain("@example.com");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");

    const rows = await db
      .select()
      .from(aiInteractions)
      .where(
        and(
          eq(aiInteractions.attemptId, attemptId),
          eq(aiInteractions.studentId, student.id),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].experimentStepId).toBe(exp.stepId);
    expect(rows[0].responseText).toBe("Check the LED polarity first.");
  });

  it("FR-STU-19: AI outage returns a fallback and the workflow continues", async () => {
    const student = await registerAs("STUDENT", "outage");
    const exp = await makeExperiment("outage");
    const attemptId = await startFor(student, exp.experimentId);

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("upstream down");
    }));
    const res = await handleAiAssist(student.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { response: string; fallback: boolean };
    expect(json.fallback).toBe(true);
    expect(json.response.length).toBeGreaterThan(0);

    const rows = await db
      .select({ id: aiInteractions.id })
      .from(aiInteractions)
      .where(eq(aiInteractions.attemptId, attemptId));
    expect(rows).toHaveLength(0);
  });

  it("FR-STU-19: upstream 500 and missing API key both fall back", async () => {
    const student = await registerAs("STUDENT", "fallback");
    const exp = await makeExperiment("fallback");
    const attemptId = await startFor(student, exp.experimentId);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 502 })));
    const r1 = await handleAiAssist(student.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId);
    expect(((await r1.json()) as { fallback: boolean }).fallback).toBe(true);

    delete process.env.OPENROUTER_API_KEY;
    const r2 = await handleAiAssist(student.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId);
    expect(r2.status).toBe(200);
    expect(((await r2.json()) as { fallback: boolean }).fallback).toBe(true);
  });

  it("FR-STU-20: assessment context applies the stricter prompt", async () => {
    const student = await registerAs("STUDENT", "assess");
    const exp = await makeExperiment("assess");
    const attemptId = await startFor(student, exp.experimentId);

    const fetchMock = mockCompletion("Recall what polarity means for an LED.");
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleAiAssist(
      student.authed(`/api/attempts/${attemptId}/assist`, askBody({ assessmentContext: true })),
      attemptId,
    );
    expect(res.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[];
    };
    const system = sent.messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("must NOT provide the direct answer");
  });

  it("FR-STU-31/CR-02: history and assistance are owner-only", async () => {
    const owner = await registerAs("STUDENT", "own");
    const intruder = await registerAs("STUDENT", "intr");
    const teacher = await registerAs("TEACHER", "tea");
    const exp = await makeExperiment("priv");
    const attemptId = await startFor(owner, exp.experimentId);

    vi.stubGlobal("fetch", mockCompletion("Hi."));
    expect(
      (await handleAiAssist(intruder.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId)).status,
    ).toBe(404);
    expect(
      (await handleAiAssist(teacher.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId)).status,
    ).toBe(403);
  });

  it("AI assistance is refused once the attempt is completed", async () => {
    const student = await registerAs("STUDENT", "done");
    const exp = await makeExperiment("done");
    const attemptId = await startFor(student, exp.experimentId);
    await db
      .update(experimentAttempts)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(experimentAttempts.id, attemptId));

    vi.stubGlobal("fetch", mockCompletion("Hi."));
    const res = await handleAiAssist(student.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId);
    expect(res.status).toBe(409);
  });

  it("rate limit holds after 30 questions in an hour", async () => {
    const student = await registerAs("STUDENT", "rl");
    const exp = await makeExperiment("rl");
    const attemptId = await startFor(student, exp.experimentId);
    vi.stubGlobal("fetch", mockCompletion("OK."));

    for (let i = 0; i < 30; i++) {
      const res = await handleAiAssist(student.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId);
      expect(res.status).toBe(200);
    }
    const limited = await handleAiAssist(student.authed(`/api/attempts/${attemptId}/assist`, askBody()), attemptId);
    expect(limited.status).toBe(429);
  });
});
