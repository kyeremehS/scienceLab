import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { experimentSteps, experimentVersions } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../PageHeader";

/** Teacher experiment library: published experiments plus the creator. */
export default async function TeacherExperimentsPage() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  const versions = await db
    .select({
      experimentId: experimentVersions.experimentId,
      versionId: experimentVersions.id,
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <PageHeader
        title="Experiments"
        subtitle="Published experiments you can assign — or create your own."
      >
        <p className="mt-3">
          <Link
            href="/dashboard/teacher/experiments/new"
            className="inline-block rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background"
          >
            New experiment
          </Link>
        </p>
      </PageHeader>

      <section aria-labelledby="library">
        <h2 id="library" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          PUBLISHED ({withCounts.length})
        </h2>
        {withCounts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">No published experiments yet.</p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {withCounts.map((e) => (
              <li key={e.experimentId} className="flex flex-col rounded-lg border border-line bg-surface px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.15em] text-ink-3">
                  {e.topic.toUpperCase()} · {e.difficulty.toUpperCase()}
                </p>
                <p className="mt-1 text-base font-semibold">
                  <Link
                    href={`/dashboard/teacher/experiments/${e.experimentId}`}
                    className="underline decoration-line underline-offset-4 hover:text-accent-ink"
                  >
                    {e.title}
                  </Link>
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {e.stepCount} steps · {e.durationMinutes} min
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
