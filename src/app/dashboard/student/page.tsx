import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assessmentSubmissions, assignments, classes, classMemberships, observations, users } from "@/db/schema";
import { experimentAttempts, experimentSteps, experimentVersions } from "@/db/schema";
import { stepProgress } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { CatalogueExplorer } from "./CatalogueExplorer";

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
  const classById = new Map(joined.map((c) => [c.id, c]));
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
    const cls = classById.get(a.classId);
    return {
      ...a,
      teacherName: cls?.teacherName ?? "Teacher",
      className: cls?.name ?? "Class",
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
        .select({ id: experimentSteps.id, order: experimentSteps.stepOrder, title: experimentSteps.title })
        .from(experimentSteps)
        .where(eq(experimentSteps.experimentVersionId, a.experimentVersionId));
      const done = await db
        .select({ id: stepProgress.id, stepId: stepProgress.experimentStepId })
        .from(stepProgress)
        .where(and(eq(stepProgress.attemptId, a.id), eq(stepProgress.status, "COMPLETED")));
      const doneIds = new Set(done.map((d) => d.stepId));
      const nextStep = steps
        .filter((s) => !doneIds.has(s.id))
        .sort((x, y) => x.order - y.order)[0] ?? null;
      const subs = await db
        .select({ score: assessmentSubmissions.score })
        .from(assessmentSubmissions)
        .where(eq(assessmentSubmissions.attemptId, a.id))
        .limit(1);
      return {
        id: a.id,
        experimentId: a.experimentId,
        status: a.status,
        startedAt: a.startedAt,
        title: vRows[0]?.title ?? "Experiment",
        stepsCompleted: done.length,
        stepsTotal: steps.length,
        nextStepTitle: nextStep?.title ?? null,
        score: subs[0]?.score ?? null,
        completedAt: a.completedAt,
      };
    }),
  );
  const inProgress = attemptMeta.filter((a) => a.status === "IN_PROGRESS");
  const completedAll = attemptMeta.filter((a) => a.status === "COMPLETED");
  const recentlyCompleted = [...completedAll]
    .sort((a, b) => +new Date(b.completedAt ?? 0) - +new Date(a.completedAt ?? 0))
    .slice(0, 3);
  const continuing = inProgress[0] ?? null;

  // Real activity streak: distinct UTC dates with attempt starts, step
  // completions, or recorded observations, counted back from today.
  const activeDays = new Set<string>();
  const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
  for (const a of myAttempts) {
    activeDays.add(dayKey(a.startedAt));
    if (a.completedAt) activeDays.add(dayKey(a.completedAt));
  }
  if (myAttempts.length > 0) {
    const attemptIds = myAttempts.map((a) => a.id);
    const completions = await db
      .select({ at: stepProgress.completedAt })
      .from(stepProgress)
      .where(inArray(stepProgress.attemptId, attemptIds));
    for (const c of completions) {
      if (c.at) activeDays.add(dayKey(c.at));
    }
    const recorded = await db
      .select({ at: observations.recordedAt })
      .from(observations)
      .where(inArray(observations.attemptId, attemptIds));
    for (const r of recorded) {
      activeDays.add(dayKey(r.at));
    }
  }
  let streak = 0;
  const cursor = new Date();
  if (!activeDays.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  function dueLabel(dueAt: Date | string | null): string | null {
    if (!dueAt) return null;
    const days = Math.ceil((+new Date(dueAt) - +now) / 86400000);
    if (days <= 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due ${new Date(dueAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}`;
  }

  const now = new Date();
  const firstName = user.name.split(" ")[0];

  const goalDone = completedAll.length;
  const goalTotal = Math.max(myAttempts.length, 1);
  const goalPct = Math.min(100, Math.round((goalDone / goalTotal) * 100));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 bg-white px-4 py-6 text-[#0F172A] sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
        {streak > 0 ? (
          <p className="flex shrink-0 items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span>{streak}-day streak</span>
          </p>
        ) : null}
      </div>

      {/* Hero row: continue (dominant) + goal ring (quiet) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-labelledby="continue-heading"
          className="flex flex-col justify-between gap-6 rounded-xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:col-span-8"
        >
          {continuing ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#64748B]">Continue where you left off</p>
                  <h2 id="continue-heading" className="mt-1 text-xl font-semibold tracking-tight">
                    {continuing.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Step {continuing.stepsCompleted + 1} of {continuing.stepsTotal}
                    {continuing.nextStepTitle ? ` — ${continuing.nextStepTitle}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-[#0F172A] px-2.5 py-1 text-xs font-medium text-white">
                  In progress
                </span>
              </div>
              <div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={continuing.stepsCompleted}
                  aria-valuemin={0}
                  aria-valuemax={continuing.stepsTotal}
                  aria-label="Attempt progress"
                >
                  <div
                    className="h-full rounded-full bg-[#0F172A]"
                    style={{ width: `${continuing.stepsTotal > 0 ? Math.round((continuing.stepsCompleted / continuing.stepsTotal) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-sm text-[#64748B]">
                    {continuing.stepsTotal > 0 ? Math.round((continuing.stepsCompleted / continuing.stepsTotal) * 100) : 0}% complete
                  </span>
                  <Link
                    href={`/dashboard/student/attempts/${continuing.id}`}
                    className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white"
                  >
                    Resume experiment
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-[#64748B]">
                  {joined.length > 0
                    ? "Continue your practical learning journey."
                    : "Join a class or explore an experiment to begin."}
                </p>
                <h2 id="continue-heading" className="mt-1 text-xl font-semibold tracking-tight">
                  {joined.length > 0 ? "Pick up an experiment" : "Start learning by doing"}
                </h2>
              </div>
              <div>
                <Link
                  href="/dashboard/student/experiments"
                  className="inline-block rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white"
                >
                  Browse experiments
                </Link>
              </div>
            </>
          )}
        </section>

        <section
          aria-labelledby="goal-heading"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:col-span-4"
        >
          <h2 id="goal-heading" className="text-sm text-[#64748B]">This week&apos;s goal</h2>
          <div
            role="progressbar"
            aria-valuenow={goalDone}
            aria-valuemin={0}
            aria-valuemax={goalTotal}
            aria-label={`${goalDone} of ${goalTotal} experiments completed`}
            className="relative flex h-20 w-20 items-center justify-center"
          >
            <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#E2E8F0" strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#0F172A"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - goalPct / 100)}`}
              />
            </svg>
            <span className="text-sm font-semibold">{goalDone} / {goalTotal}</span>
          </div>
          <p className="text-sm text-[#64748B]">experiments completed</p>
        </section>
      </div>

      {assignedWork.length > 0 ? (
        <section aria-labelledby="assigned">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="assigned" className="text-base font-semibold tracking-tight">
              Assigned by your teacher
            </h2>
            <p className="text-sm text-[#64748B]">{assignedWork.length} active</p>
          </div>
          <div className="-mx-1 mt-3 flex gap-4 overflow-x-auto px-1 pb-2">
            {assignedWork.map((a) => (
              <div
                key={a.id}
                className="flex w-[260px] shrink-0 flex-col gap-2 rounded-xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                      a.status === "IN_PROGRESS" ? "bg-[#0F172A] text-white" : "bg-slate-100 text-[#0F172A]"
                    }`}
                  >
                    {a.status === "IN_PROGRESS" ? "In progress" : a.status === "COMPLETED" ? "Completed" : "Not started"}
                  </span>
                  {dueLabel(a.dueAt) ? (
                    <span className="truncate text-xs text-[#64748B]">{dueLabel(a.dueAt)}</span>
                  ) : null}
                </div>
                <p className="text-[15px] font-semibold leading-snug">
                  <Link
                    href={a.attemptId ? `/dashboard/student/attempts/${a.attemptId}` : `/dashboard/student/experiments/${a.experimentId}`}
                  >
                    {a.title}
                  </Link>
                </p>
                <p className="truncate text-sm text-[#64748B]">{a.teacherName} · {a.className}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="experiments">
        <h2 id="experiments" className="text-base font-semibold tracking-tight">
          Explore the catalogue
        </h2>
        <CatalogueExplorer experiments={experimentsWithCounts} />
      </section>

      {joined.length === 0 ? (
        <section aria-labelledby="my-classes">
          <h2 id="my-classes" className="text-base font-semibold tracking-tight">My classes</h2>
          <p className="mt-2 text-sm text-[#64748B]">
            You haven&apos;t joined a class yet —{" "}
            <Link href="/dashboard/student/classes" className="font-medium text-[#0F172A] underline underline-offset-4">
              join with your teacher&apos;s code
            </Link>
            .
          </p>
        </section>
      ) : null}

      {recentlyCompleted.length > 0 ? (
        <section aria-labelledby="recently-completed">
          <h2 id="recently-completed" className="text-base font-semibold tracking-tight">Recently completed</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {recentlyCompleted.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <p className="text-[15px] font-semibold leading-snug">
                  <Link href={`/dashboard/student/attempts/${a.id}`}>{a.title}</Link>
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">
                    {a.score !== null ? `Score ${Math.round(Number(a.score) * 100)}%` : "Completed"}
                  </span>
                  <Link
                    href={`/dashboard/student/attempts/${a.id}`}
                    className="text-sm font-medium text-[#0F172A]"
                  >
                    Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
