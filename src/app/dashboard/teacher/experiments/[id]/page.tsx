import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentQuestions,
  assessments,
  experimentSteps,
  experimentVersions,
  observationDefinitions,
} from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { NavLink } from "@/app/NavLink";
import { PageHeader } from "../../../PageHeader";

/** Teacher read-only preview of a published experiment (assign with confidence). */
export default async function TeacherExperimentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

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
  if (!version) redirect("/dashboard/teacher/experiments");

  const steps = await db
    .select()
    .from(experimentSteps)
    .where(eq(experimentSteps.experimentVersionId, version.id))
    .orderBy(asc(experimentSteps.stepOrder));
  const defs = await db.select().from(observationDefinitions);
  const defsByStep = new Map<string, typeof defs>();
  for (const d of defs) {
    const list = defsByStep.get(d.experimentStepId) ?? [];
    list.push(d);
    defsByStep.set(d.experimentStepId, list);
  }
  const assRows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.experimentVersionId, version.id))
    .limit(1);
  const questions = assRows[0]
    ? await db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, assRows[0].id))
        .orderBy(asc(assessmentQuestions.questionOrder))
    : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <PageHeader title={version.title} subtitle={version.description}>
        <p className="mt-2 text-sm">
          <NavLink href="/dashboard/teacher/experiments" arrow="back">
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

      <section aria-labelledby="objectives">
        <h2 id="objectives" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          LEARNING OBJECTIVES
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{version.objectives}</p>
      </section>

      <section aria-labelledby="materials">
        <h2 id="materials" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          MATERIALS
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{version.materials}</p>
      </section>

      <section aria-labelledby="safety">
        <h2 id="safety" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          SAFETY
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{version.safety}</p>
      </section>

      <section aria-labelledby="steps">
        <h2 id="steps" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          STEPS ({steps.length})
        </h2>
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((s) => (
            <li key={s.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="font-medium">
                <span className="mr-2 font-mono text-sm text-ink-3">{s.stepOrder}</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm text-ink-2">{s.instructions}</p>
              {(defsByStep.get(s.id) ?? []).map((d) => (
                <p key={d.id} className="mt-1 text-sm text-ink-3">
                  Observe ({d.required ? "required" : "optional"}): {d.prompt}
                </p>
              ))}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="assessment-preview">
        <h2 id="assessment-preview" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          ASSESSMENT ({questions.length} QUESTIONS)
        </h2>
        <ol className="mt-3 flex flex-col gap-3">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="text-sm font-medium">
                <span className="mr-2 font-mono text-xs text-ink-3">{i + 1}</span>
                {q.questionText}
              </p>
              {q.type === "MULTIPLE_CHOICE" && Array.isArray(q.options) ? (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
                  {(q.options as string[]).map((o) => (
                    <li key={o}>
                      {o === q.expectedAnswer ? "✓ " : "· "}{o}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-ink-3">Expected: {q.expectedAnswer}</p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
