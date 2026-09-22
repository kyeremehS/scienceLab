import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { experimentSteps, experimentVersions } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../PageHeader";
import { ExperimentCard } from "./ExperimentCard";

export default async function ExperimentsCataloguePage() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard/teacher");

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <PageHeader
        title="Experiments"
        subtitle="Published experiments you can explore."
      />
      {withCounts.length === 0 ? (
        <p className="text-sm text-ink-2">No published experiments yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {withCounts.map((e) => (
            <ExperimentCard key={e.experimentId} experiment={e} />
          ))}
        </ul>
      )}
    </main>
  );
}
