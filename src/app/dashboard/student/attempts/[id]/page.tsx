import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { experimentAttempts, experimentVersions } from "@/db/schema";
import { buildAttemptState } from "@/lib/attempts-service";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../../PageHeader";
import { AttemptRunner } from "./AttemptRunner";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard/teacher");

  const { id } = await params;
  const rows = await db
    .select()
    .from(experimentAttempts)
    .where(and(eq(experimentAttempts.id, id), eq(experimentAttempts.studentId, user.id)))
    .limit(1);
  const attempt = rows[0];
  if (!attempt) redirect("/dashboard/student/experiments");

  const versions = await db
    .select({ title: experimentVersions.title })
    .from(experimentVersions)
    .where(eq(experimentVersions.id, attempt.experimentVersionId))
    .limit(1);

  const state = await buildAttemptState(attempt);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={versions[0]?.title ?? "Experiment"}
        subtitle="Follow each step, record what you observe, and mark steps complete as you go."
      />
      <AttemptRunner initial={state} />
    </main>
  );
}
