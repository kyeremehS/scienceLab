import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assessmentSubmissions, assignments, classes, classMemberships, users } from "@/db/schema";
import { experimentAttempts, experimentSteps, experimentVersions } from "@/db/schema";
import { stepProgress } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { Hero, StatCards } from "../Hero";
import { FirstStepsChecklist } from "./FirstStepsChecklist";
import { ExperimentCard } from "./experiments/ExperimentCard";

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

  // In-progress and recently completed attempts with live titles and scores.
  const attemptMeta = await Promise.all(
    myAttempts.map(async (a) => {
      const vRows = await db
        .select({ title: experimentVersions.title, versionId: experimentVersions.id })
        .from(experimentVersions)
        .where(eq(experimentVersions.id, a.experimentVersionId))
        .limit(1);
      const steps = await db
        .select({ id: experimentSteps.id })
        .from(experimentSteps)
        .where(eq(experimentSteps.experimentVersionId, a.experimentVersionId));
      const done = await db
        .select({ id: stepProgress.id })
        .from(stepProgress)
        .where(and(eq(stepProgress.attemptId, a.id), eq(stepProgress.status, "COMPLETED")));
      const subs = await db
        .select({ score: assessmentSubmissions.score })
        .from(assessmentSubmissions)
        .where(eq(assessmentSubmissions.attemptId, a.id))
        .limit(1);
      return {
        id: a.id,
        experimentId: a.experimentId,
        status: a.status,
        title: vRows[0]?.title ?? "Experiment",
        stepsCompleted: done.length,
        stepsTotal: steps.length,
        score: subs[0]?.score ?? null,
        completedAt: a.completedAt,
      };
    }),
  );
  const inProgress = attemptMeta.filter((a) => a.status === "IN_PROGRESS");
  const recentlyCompleted = attemptMeta
    .filter((a) => a.status === "COMPLETED")
    .sort((a, b) => +new Date(b.completedAt ?? 0) - +new Date(a.completedAt ?? 0))
    .slice(0, 3);

  const firstName = user.name.split(" ")[0];
  const teachers = [...new Set(joined.map((c) => c.teacherName))];
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const activity = [...joined]
    .sort((a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt))
    .slice(0, 4);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Hero
        eyebrow={today}
        title={`Good morning, ${firstName}.`}
        subtitle={
          joined.length > 0
            ? "Continue your practical learning journey."
            : "Join a class or explore an experiment to begin."
        }
        cta={
          joined.length > 0
            ? { label: "Browse experiments →", href: "/dashboard/student/experiments" }
            : undefined
        }
      />

      <StatCards
        stats={[
          { value: String(experimentsWithCounts.length), label: "Experiments available" },
          { value: String(joined.length), label: joined.length === 1 ? "Class joined" : "Classes joined" },
          { value: String(teachers.length), label: teachers.length === 1 ? "Teacher" : "Teachers" },
        ]}
      />

      <section aria-labelledby="experiments">
        {assignedWork.length > 0 ? (
          <div className="mb-8">
            <h2 id="assigned" className="text-base font-semibold tracking-tight">
              Assigned work
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {assignedWork.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{a.title}</span>
                    <span className="block font-mono text-xs text-ink-3">
                      {a.className.toUpperCase()} · {a.status.replace("_", " ")}
                      {a.dueAt ? ` · DUE ${new Date(a.dueAt).toLocaleDateString().toUpperCase()}` : ""}
                    </span>
                  </span>
                  <NavLink
                    href={a.attemptId ? `/dashboard/student/attempts/${a.attemptId}` : `/dashboard/student/experiments/${a.experimentId}`}
                    arrow="forward"
                    className="shrink-0"
                  >
                    {a.status === "NOT_STARTED" ? "Start" : a.status === "COMPLETED" ? "Review" : "Continue"}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between">
          <h2 id="experiments" className="text-base font-semibold tracking-tight">
            Your experiments
          </h2>
          <NavLink href="/dashboard/student/experiments">
            Browse all
          </NavLink>
        </div>
        {experimentsWithCounts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">No published experiments yet.</p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experimentsWithCounts.map((e) => (
              <ExperimentCard key={e.experimentId} experiment={e} />
            ))}
          </ul>
        )}

        <h2 className="mt-8 text-base font-semibold tracking-tight">My classes</h2>
        {joined.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">
            You haven&apos;t joined a class yet — see the first steps below.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-2">
            You&apos;re in {joined.length} class{joined.length === 1 ? "" : "es"} —{" "}
            <NavLink href="/dashboard/student/classes">
              view classes or join another
            </NavLink>
            .
          </p>
        )}
        {inProgress.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-base font-semibold tracking-tight">In progress</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {inProgress.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{a.title}</span>
                    <span className="block font-mono text-xs text-ink-3">
                      STEP {a.stepsCompleted} OF {a.stepsTotal}
                    </span>
                  </span>
                  <NavLink href={`/dashboard/student/attempts/${a.id}`} arrow="forward" className="shrink-0">
                    Continue
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {recentlyCompleted.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-base font-semibold tracking-tight">Recently completed</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {recentlyCompleted.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{a.title}</span>
                    <span className="block font-mono text-xs text-ink-3">
                      {a.score !== null ? `SCORE ${Math.round(Number(a.score) * 100)}% · ` : ""}
                      {a.completedAt ? new Date(a.completedAt).toLocaleDateString().toUpperCase() : ""}
                    </span>
                  </span>
                  <NavLink href={`/dashboard/student/attempts/${a.id}`} arrow="forward" className="shrink-0">
                    Review
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div aria-label="Progress panel" className="grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
        <section aria-labelledby="teachers">
          <h2 id="teachers" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
            YOUR TEACHERS
          </h2>
          {teachers.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">
              No teachers yet — join a class with a code from your teacher.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {teachers.map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raised text-sm font-semibold text-accent-ink"
                  >
                    {t.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">{t}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity">
          <h2 id="activity" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
            RECENT ACTIVITY
          </h2>
          {activity.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">
              Your learning activity appears here as you start experimenting.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              {activity.map((a) => (
                <li key={a.id}>
                  <p className="font-medium">Joined {a.name}</p>
                  <p className="text-xs text-ink-3">
                    {new Date(a.joinedAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="first-steps">
          <h2 id="first-steps" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
            FIRST STEPS
          </h2>
          <div className="mt-2">
            <FirstStepsChecklist joinedClass={joined.length > 0} />
          </div>
        </section>
      </div>
    </main>
  );
}
