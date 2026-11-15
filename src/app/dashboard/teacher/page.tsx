import Link from "next/link";
import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assessmentSubmissions, assignments, classes, classMemberships, experimentAttempts, experimentVersions, users } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { Badge } from "@/app/ui/Badge";
import { Card } from "@/app/ui/Card";
import { StatCards } from "@/app/ui/StatCards";

export default async function TeacherDashboard() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  const owned = await db.select().from(classes).where(eq(classes.teacherId, user.id));
  const withMembers = await Promise.all(
    owned.map(async (c) => {
      const members = await db
        .select({
          studentId: classMemberships.studentId,
          studentName: users.name,
          joinedAt: classMemberships.joinedAt,
        })
        .from(classMemberships)
        .innerJoin(users, eq(users.id, classMemberships.studentId))
        .where(and(eq(classMemberships.classId, c.id), eq(classMemberships.active, true)))
        .orderBy(users.name);
      return { ...c, members };
    }),
  );

  const totalStudents = withMembers.reduce((sum, c) => sum + c.members.length, 0);
  const ownedIds = owned.map((c) => c.id);
  const [{ value: activeAssignmentCount }] =
    ownedIds.length === 0
      ? [{ value: 0 }]
      : await db
          .select({ value: count() })
          .from(assignments)
          .where(and(inArray(assignments.classId, ownedIds), eq(assignments.status, "ACTIVE")));

  // Per-class progress + attention signals, all from real learning state.
  type AttentionItem = { classId: string; className: string; studentId: string; studentName: string; reason: string };
  const attention: AttentionItem[] = [];
  const classProgressList = await Promise.all(
    withMembers.map(async (c) => {
      const assigned = await db
        .select({ experimentId: assignments.experimentId, title: experimentVersions.title })
        .from(assignments)
        .innerJoin(experimentVersions, eq(experimentVersions.id, assignments.experimentVersionId))
        .where(and(eq(assignments.classId, c.id), eq(assignments.status, "ACTIVE")));
      let done = 0;
      let total = 0;
      for (const m of c.members) {
        for (const a of assigned) {
          total += 1;
          const attRows = await db
            .select({ id: experimentAttempts.id, status: experimentAttempts.status, completedAt: experimentAttempts.completedAt })
            .from(experimentAttempts)
            .where(and(eq(experimentAttempts.studentId, m.studentId), eq(experimentAttempts.experimentId, a.experimentId)))
            .limit(1);
          const att = attRows[0];
          if (!att) {
            if (attention.length < 6) {
              attention.push({ classId: c.id, className: c.name, studentId: m.studentId, studentName: m.studentName, reason: `Not started: ${a.title}` });
            }
            continue;
          }
          if (att.status === "COMPLETED") {
            done += 1;
          } else {
            const subs = await db
              .select({ score: assessmentSubmissions.score })
              .from(assessmentSubmissions)
              .where(eq(assessmentSubmissions.attemptId, att.id))
              .limit(1);
            if (subs[0] && Number(subs[0].score) < 0.5 && attention.length < 6) {
              attention.push({ classId: c.id, className: c.name, studentId: m.studentId, studentName: m.studentName, reason: `Low score on ${a.title} (${Math.round(Number(subs[0].score) * 100)}%)` });
            }
          }
        }
      }
      return {
        ...c,
        completionPct: total === 0 ? null : Math.round((done / total) * 100),
      };
    }),
  );
  const pcts = classProgressList.map((c) => c.completionPct).filter((p): p is number => p !== null);
  const avgCompletion = pcts.length === 0 ? null : Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);

  const firstName = user.name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Get started checklist (p5): a step is ticked once its state exists.
  const steps: { done: boolean; label: string }[] = [
    { done: owned.length > 0, label: "Create your classes" },
    { done: totalStudents > 0, label: "Invite students" },
    { done: activeAssignmentCount > 0, label: "Create an assignment" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-teal dark:text-teal-light">
            {today}
          </p>
          <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">
            Good morning, {firstName}.
          </h1>
        </div>
        <Link
          href="/dashboard/teacher/classes"
          className="mt-1 shrink-0 rounded-btn bg-orange px-7 py-[15px] text-[16px] font-semibold text-white transition-colors duration-150 hover:bg-orange-hover"
        >
          Invite students
        </Link>
      </header>

      <StatCards
        stats={[
          { value: String(owned.length), label: owned.length === 1 ? "Class" : "Classes" },
          { value: String(totalStudents), label: totalStudents === 1 ? "Student" : "Students" },
          { value: String(activeAssignmentCount), label: activeAssignmentCount === 1 ? "Active assignment" : "Active assignments" },
          { value: avgCompletion === null ? "—" : `${avgCompletion}%`, label: "Avg. completion" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section aria-labelledby="class-progress" className="min-w-0 lg:col-span-8">
          <Card padded={false} className="h-full p-5 sm:p-6">
            <h2
              id="class-progress"
              className="border-b border-line pb-4 font-display text-lg font-semibold tracking-tight"
            >
              Class progress
            </h2>
            {classProgressList.length === 0 ? (
              <p className="py-5 text-sm text-ink-2">
                No classes yet.{" "}
                <NavLink href="/dashboard/teacher/classes">
                  Create your first class
                </NavLink>{" "}
                and share its code so students can join.
              </p>
            ) : (
              <div>
                {classProgressList.map((c) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                  >
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="truncate text-sm text-ink-2">
                        {c.members.length} student{c.members.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge tone="neutral" className="justify-self-start sm:justify-self-center">
                      {c.completionPct === null ? "No assigned work" : `${c.completionPct}%`}
                    </Badge>
                    <NavLink
                      href={`/dashboard/teacher/classes/${c.id}`}
                      arrow="forward"
                      className="justify-self-end"
                    >
                      Open
                    </NavLink>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <section aria-labelledby="get-started">
            <div className="rounded-xl bg-teal p-5 text-on-band sm:p-6">
              <h2
                id="get-started"
                className="border-b border-white/25 pb-4 font-display text-lg font-semibold tracking-tight"
              >
                Get started
              </h2>
              <ol className="mt-1">
                {steps.map((s, i) => (
                  <li
                    key={s.label}
                    className="flex items-baseline gap-3 border-b border-white/25 py-4 text-[15px] last:border-b-0"
                  >
                    <span aria-hidden="true" className="w-5 shrink-0">
                      {s.done ? "✓" : `${i + 1}.`}
                    </span>
                    <span>{s.label}</span>
                    <span className="sr-only">{s.done ? "(done)" : "(not done)"}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section aria-labelledby="needs-attention">
            <Card>
              <h2
                id="needs-attention"
                className="font-display text-lg font-semibold tracking-tight"
              >
                Needs attention
              </h2>
              {attention.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">
                  Nothing flagged. Every student with assigned work has started.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {attention.map((f) => (
                    <li key={`${f.studentId}-${f.reason}`} className="rounded-lg bg-raised px-3 py-2">
                      <p className="text-sm font-medium">
                        <NavLink href={`/dashboard/teacher/classes/${f.classId}/students/${f.studentId}`}>
                          {f.studentName}
                        </NavLink>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-2">{f.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
