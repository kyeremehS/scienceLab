import { NextResponse } from "next/server";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  experimentSteps,
  experimentVersions,
  observationDefinitions,
} from "@/db/schema";
import { getRequestSession } from "@/lib/auth-service";

/** GET /api/experiments — published catalogue with step counts. */
export async function handleListExperiments(req: Request): Promise<NextResponse> {
  const user = await getRequestSession(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const versions = await db
    .select({
      experimentId: experimentVersions.experimentId,
      versionId: experimentVersions.id,
      versionNumber: experimentVersions.versionNumber,
      title: experimentVersions.title,
      description: experimentVersions.description,
      difficulty: experimentVersions.difficulty,
      topic: experimentVersions.topic,
      durationMinutes: experimentVersions.durationMinutes,
    })
    .from(experimentVersions)
    .where(eq(experimentVersions.status, "PUBLISHED"));

  const withCounts = await Promise.all(
    versions.map(async (v) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(experimentSteps)
        .where(eq(experimentSteps.experimentVersionId, v.versionId));
      return { ...v, stepCount: value };
    }),
  );

  return NextResponse.json({ experiments: withCounts }, { status: 200 });
}

/** GET /api/experiments/[id] — pre-start details (no assessment content). */
export async function handleGetExperiment(req: Request, experimentId: string): Promise<NextResponse> {
  const user = await getRequestSession(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const versions = await db
    .select()
    .from(experimentVersions)
    .where(
      and(
        eq(experimentVersions.experimentId, experimentId),
        eq(experimentVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  const version = versions[0];
  if (!version) {
    return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
  }

  const steps = await db
    .select({
      id: experimentSteps.id,
      order: experimentSteps.stepOrder,
      title: experimentSteps.title,
    })
    .from(experimentSteps)
    .where(eq(experimentSteps.experimentVersionId, version.id))
    .orderBy(asc(experimentSteps.stepOrder));

  const stepIds = steps.map((s) => s.id);
  const observations =
    stepIds.length === 0
      ? []
      : await db
          .select({
            id: observationDefinitions.id,
            stepId: observationDefinitions.experimentStepId,
            order: observationDefinitions.displayOrder,
            prompt: observationDefinitions.prompt,
            required: observationDefinitions.required,
          })
          .from(observationDefinitions)
          .orderBy(asc(observationDefinitions.displayOrder));

  const byStep = new Map(steps.map((s) => [s.id, [] as typeof observations]));
  for (const o of observations) {
    if (stepIds.includes(o.stepId)) byStep.get(o.stepId)?.push(o);
  }

  return NextResponse.json(
    {
      experiment: {
        id: version.experimentId,
        versionId: version.id,
        versionNumber: version.versionNumber,
        title: version.title,
        description: version.description,
        objectives: version.objectives,
        materials: version.materials,
        safety: version.safety,
        durationMinutes: version.durationMinutes,
        difficulty: version.difficulty,
        topic: version.topic,
        steps: steps.map((s) => ({ ...s, observations: byStep.get(s.id) ?? [] })),
      },
    },
    { status: 200 },
  );
}
