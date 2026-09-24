import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  experimentAttempts,
  experimentSteps,
  experimentVersions,
  observationDefinitions,
} from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { CircuitIllustration } from "@/app/auth/CircuitIllustration";
import { PageHeader } from "../../../PageHeader";
import { StartExperimentButton } from "./StartExperimentButton";

export default async function ExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard/teacher");

  const { id } = await params;
  const versions = await db
    .select()
    .from(experimentVersions)
    .where(
      and(
        eq(experimentVersions.experimentId, id),
        eq(experimentVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  const version = versions[0];
  if (!version) redirect("/dashboard/student/experiments");

  const steps = await db
    .select({
      id: experimentSteps.id,
      order: experimentSteps.stepOrder,
      title: experimentSteps.title,
      instructions: experimentSteps.instructions,
    })
    .from(experimentSteps)
    .where(eq(experimentSteps.experimentVersionId, version.id))
    .orderBy(asc(experimentSteps.stepOrder));

  const obsDefs = await db
    .select({
      stepId: observationDefinitions.experimentStepId,
      prompt: observationDefinitions.prompt,
      required: observationDefinitions.required,
    })
    .from(observationDefinitions)
    .orderBy(asc(observationDefinitions.displayOrder));
  const requiredCount = obsDefs.filter((o) => o.required).length;

  const existingAttempts = await db
    .select({ id: experimentAttempts.id })
    .from(experimentAttempts)
    .where(
      and(
        eq(experimentAttempts.studentId, user.id),
        eq(experimentAttempts.experimentId, id),
      ),
    )
    .limit(1);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <PageHeader title={version.title} subtitle={version.description}>
        <p className="mt-2 text-sm">
          <NavLink href="/dashboard/student/experiments" arrow="back">
            Experiments
          </NavLink>
        </p>
      </PageHeader>

      <dl
        aria-label="Experiment facts"
        className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface px-5 py-4 sm:grid-cols-4"
      >
        {[
          ["TOPIC", version.topic],
          ["DIFFICULTY", version.difficulty],
          ["DURATION", `${version.durationMinutes} min`],
          ["STEPS", String(steps.length)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-xs text-ink-3">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <StartExperimentButton experimentId={id} hasAttempt={existingAttempts.length > 0} />
      </div>

      <section aria-labelledby="steps">
        <h2 id="steps" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          WHAT YOU&apos;LL DO · {steps.length} STEPS · {requiredCount} REQUIRED OBSERVATION{requiredCount === 1 ? "" : "S"}
        </h2>
        <ol className="mt-3 flex flex-col">
          {steps.map((s) => (
            <li key={s.id} className="flex items-baseline gap-3 border-t border-line py-2.5 last:border-b">
              <span aria-hidden="true" className="font-mono text-sm text-ink-3">{s.order}</span>
              <span className="text-sm font-medium">{s.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-ink-3">
          Full instructions appear inside the workspace when you start.
        </p>
      </section>

      <section aria-labelledby="prepare" className="rounded-xl border border-line bg-surface px-5 py-4">
        <h2 id="prepare" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          PREPARE
        </h2>
        <div className="mt-3 grid gap-5 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold">Objectives</h3>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
              {version.objectives.split("\n").map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Materials</h3>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
              {version.materials.split("\n").map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Safety</h3>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
              {version.safety.split("\n").map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <span aria-hidden="true">
        <CircuitIllustration className="mx-auto w-full max-w-xs text-ink" />
      </span>
    </main>
  );
}
