import { NavLink } from "@/app/NavLink";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assignments, classes, classMemberships, users } from "@/db/schema";
import { experimentAttempts, experimentSteps, experimentVersions } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { Badge, type BadgeTone } from "@/app/ui/Badge";
import { Card } from "@/app/ui/Card";
import { JoinClassForm } from "./JoinClassForm";
import { CatalogueExplorer } from "./CatalogueExplorer";

/** Spec status pills (pp.6–7): warm Not started, neutral In progress, pale teal Done. */
const STATUS: Record<
  "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
  { label: string; tone: BadgeTone }
> = {
  NOT_STARTED: { label: "Not started", tone: "pending" },
  IN_PROGRESS: { label: "In progress", tone: "neutral" },
  COMPLETED: { label: "Done", tone: "done" },
};

export default async function StudentDashboard() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard/teacher");

  const joined = await db
    .select({
      id: classes.id,
      name: classes.name,
      teacherName: users.name,
      joinedAt: classMemberships.joinedAt,
    })
    .from(classMemberships)
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .innerJoin(users, eq(users.id, classes.teacherId))
    .where(and(eq(classMemberships.studentId, user.id), eq(classMemberships.active, true)));

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

  const experimentsWithCounts = await Promise.all(
    versions.map(async (v) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(experimentSteps)
        .where(eq(experimentSteps.experimentVersionId, v.versionId));
      return { ...v, stepCount: value };
    }),
  );

  // Assigned work (FR-STU-04): active assignments across all joined classes,
  // each with the student's derived status.
  const classIds = joined.map((c) => c.id);
  const classNameById = new Map(joined.map((c) => [c.id, c.name]));
  const activeAssignments = classIds.length === 0
    ? []
    : await db
        .select({
          id: assignments.id,
          classId: assignments.classId,
          experimentId: assignments.experimentId,
          title: experimentVersions.title,
          dueAt: assignments.dueAt,
        })
        .from(assignments)
        .innerJoin(experimentVersions, eq(experimentVersions.id, assignments.experimentVersionId))
        .where(and(inArray(assignments.classId, classIds), eq(assignments.status, "ACTIVE")));
  const myAttempts = await db
    .select()
    .from(experimentAttempts)
    .where(eq(experimentAttempts.studentId, user.id));
  const attemptByExperiment = new Map(myAttempts.map((a) => [a.experimentId, a]));
  const assignedWork = activeAssignments.map((a) => {
    const attempt = attemptByExperiment.get(a.experimentId);
    return {
      ...a,
      className: classNameById.get(a.classId) ?? "Class",
      status: (attempt ? attempt.status : "NOT_STARTED") as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
      attemptId: attempt?.id ?? null,
    };
  });

  const firstName = user.name.split(" ")[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">
          Hi, {firstName}.
        </h1>
        <p className="mt-3 text-base text-ink-2">Here is what&apos;s due next.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section aria-labelledby="assigned" className="min-w-0 lg:col-span-8">
          <Card padded={false} className="h-full p-5 sm:p-6">
            <h2
              id="assigned"
              className="border-b border-line pb-4 font-display text-lg font-semibold tracking-tight"
            >
              Assigned work
            </h2>
            {assignedWork.length === 0 ? (
              <p className="py-5 text-sm text-ink-2">Nothing due right now.</p>
            ) : (
              <ul>
                {assignedWork.map((a) => {
                  const status = STATUS[a.status];
                  const action =
                    a.status === "NOT_STARTED" ? "Start" : a.status === "COMPLETED" ? "Review" : "Continue";
                  return (
                    <li
                      key={a.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                    >
                      <span className="col-span-2 min-w-0 sm:col-span-1">
                        <span className="block truncate text-sm font-semibold">{a.title}</span>
                        <span className="block truncate text-sm text-ink-2">
                          {a.className}
                          {a.dueAt ? ` · Due ${new Date(a.dueAt).toLocaleDateString()}` : ""}
                        </span>
                      </span>
                      <Badge tone={status.tone} className="justify-self-start sm:justify-self-center">
                        {status.label}
                      </Badge>
                      <NavLink
                        href={
                          a.attemptId
                            ? `/dashboard/student/attempts/${a.attemptId}`
                            : `/dashboard/student/experiments/${a.experimentId}`
                        }
                        arrow="forward"
                        className="justify-self-end"
                      >
                        {action}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <section aria-labelledby="join-class">
            <Card>
              <h2 id="join-class" className="font-display text-lg font-semibold tracking-tight">
                Join a class
              </h2>
              <JoinClassForm />
            </Card>
          </section>

          <section aria-labelledby="my-classes">
            <Card padded={false} className="p-5 sm:p-6">
              <h2
                id="my-classes"
                className="border-b border-line pb-4 font-display text-lg font-semibold tracking-tight"
              >
                My classes
              </h2>
              {joined.length === 0 ? (
                <p className="py-4 text-sm text-ink-2">You haven&apos;t joined a class yet.</p>
              ) : (
                <ul>
                  {joined.map((c) => (
                    <li key={c.id} className="border-b border-line last:border-b-0">
                      <Link
                        href={`/dashboard/student/classes/${c.id}`}
                        className="block py-4 text-sm font-semibold transition-colors duration-150 hover:text-accent-ink"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>

      <section aria-labelledby="experiments">
        <div className="flex items-baseline justify-between">
          <h2 id="experiments" className="font-display text-lg font-semibold tracking-tight">
            Explore the catalogue
          </h2>
          <NavLink href="/dashboard/student/experiments">Browse all</NavLink>
        </div>
        <CatalogueExplorer
          experiments={experimentsWithCounts}
          assignedExperimentIds={new Set(assignedWork.map((a) => a.experimentId))}
        />
      </section>
    </main>
  );
}
