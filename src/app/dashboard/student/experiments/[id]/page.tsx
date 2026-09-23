import Link from "next/link";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <PageHeader title={version.title} subtitle={version.description}>
        <p className="mt-2 text-sm">
          <Link href="/dashboard/student/experiments" className="text-accent-ink underline">
            ← Experiments
          </Link>
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

      <div className="rounded-xl border border-line bg-surface px-4 pt-2">
        <CircuitIllustration className="mx-auto w-full max-w-md text-ink" />
      </div>

      <section aria-labelledby="objectives">
        <h2 id="objectives" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          LEARNING OBJECTIVES
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
          {version.objectives.split("\n").map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="materials">
        <h2 id="materials" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          MATERIALS
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
          {version.materials.split("\n").map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="safety">
        <h2 id="safety" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          SAFETY
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
          {version.safety.split("\n").map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps">
        <h2 id="steps" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          STEPS ({steps.length}) · {requiredCount} REQUIRED OBSERVATION{requiredCount === 1 ? "" : "S"}
        </h2>
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((s) => (
            <li key={s.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="font-medium">
                <span className="mr-2 font-mono text-sm text-ink-3">{s.order}</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm text-ink-2">{s.instructions}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="start">
        <h2 id="start" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          START
        </h2>
        <div className="mt-3">
          <StartExperimentButton experimentId={id} hasAttempt={existingAttempts.length > 0} />
        </div>
      </section>
    </main>
  );
}
