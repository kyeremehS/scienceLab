import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assessmentSubmissions, assignments, classes, classMemberships, experimentAttempts, experimentVersions, users } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { Hero, StatCards } from "../Hero";

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

  // Per-class progress + attention signals + activity, all from real learning state.
  type AttentionItem = { classId: string; className: string; studentId: string; studentName: string; reason: string };
  const attention: AttentionItem[] = [];
  const activity: { title: string; detail: string; at: Date }[] = [];
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
        activity.push({ title: `Joined ${c.name}`, detail: m.studentName, at: new Date(m.joinedAt) });
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
            activity.push({ title: `Completed ${a.title}`, detail: m.studentName, at: new Date(att.completedAt ?? m.joinedAt) });
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
        assignedTitles: assigned.map((a) => a.title),
        completionPct: total === 0 ? null : Math.round((done / total) * 100),
      };
    }),
  );
  const pcts = classProgressList.map((c) => c.completionPct).filter((p): p is number => p !== null);
  const avgCompletion = pcts.length === 0 ? null : Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
  activity.sort((a, b) => +b.at - +a.at);
  const recentActivity = activity.slice(0, 6);

  const firstName = user.name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Hero
        eyebrow={today}
        title={`Good morning, ${firstName}.`}
        subtitle={`You manage ${owned.length} class${owned.length === 1 ? "" : "es"} and ${totalStudents} student${totalStudents === 1 ? "" : "s"}.`}
        cta={{ label: "Manage classes →", href: "/dashboard/teacher/classes" }}
      />

      <StatCards
        stats={[
          { value: String(owned.length), label: owned.length === 1 ? "Class" : "Classes" },
          { value: String(totalStudents), label: totalStudents === 1 ? "Student" : "Students" },
          { value: String(activeAssignmentCount), label: activeAssignmentCount === 1 ? "Active assignment" : "Active assignments" },
          { value: avgCompletion === null ? "—" : `${avgCompletion}%`, label: "Avg. completion" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-labelledby="class-progress"
          className="flex flex-col rounded-xl border border-line bg-surface p-5 lg:col-span-8"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="class-progress" className="text-base font-semibold tracking-tight">
              Class progress
            </h2>
            <NavLink href="/dashboard/teacher/classes" className="shrink-0">
              Manage classes
            </NavLink>
          </div>
          {classProgressList.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">
              No classes yet.{" "}
              <NavLink href="/dashboard/teacher/classes">
                Create your first class
              </NavLink>{" "}
              and share its code so students can join.
            </p>
          ) : (
            <div className="mt-3 flex flex-col">
              {classProgressList.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-4 py-4 ${i !== classProgressList.length - 1 ? "border-b border-line" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <span className="shrink-0 font-mono text-xs text-ink-3">
                        {c.completionPct === null ? "NO ASSIGNED WORK" : `${c.completionPct}%`}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-ink-3">
                      {c.members.length} STUDENT{c.members.length === 1 ? "" : "S"}
                      {c.assignedTitles.length > 0 ? ` · ASSIGNED: ${c.assignedTitles.join(", ").toUpperCase()}` : ""}
                    </p>
                    {c.completionPct !== null ? (
                      <div
                        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-raised"
                        role="progressbar"
                        aria-valuenow={c.completionPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${c.name} completion`}
                      >
                        <div className="h-full rounded-full bg-accent" style={{ width: `${c.completionPct}%` }} />
                      </div>
                    ) : null}
                  </div>
                  <NavLink
                    href={`/dashboard/teacher/classes/${c.id}`}
                    arrow="forward"
                    className="shrink-0"
                  >
                    Open
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="needs-attention"
          className="flex h-fit flex-col rounded-xl border border-line bg-surface p-5 lg:col-span-4"
        >
          <h2 id="needs-attention" className="text-base font-semibold tracking-tight">
            Needs attention
          </h2>
          {attention.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">
              Nothing flagged — every student with assigned work has started.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {attention.map((f) => (
                <li key={`${f.studentId}-${f.reason}`} className="rounded-lg bg-raised px-3 py-2">
                  <p className="text-sm font-medium">
                    <NavLink
                      href={`/dashboard/teacher/classes/${f.classId}/students/${f.studentId}`}
                    >
                      {f.studentName}
                    </NavLink>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-2">{f.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        aria-labelledby="recent-activity"
        className="flex flex-col rounded-xl border border-line bg-surface p-5"
      >
        <h2 id="recent-activity" className="text-base font-semibold tracking-tight">
          Recent activity
        </h2>
        {recentActivity.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">
            Joins and completions appear here as your classes get going.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {recentActivity.map((a, i) => (
              <li
                key={`${a.title}-${a.detail}-${i}`}
                className={`flex items-center gap-3 py-2.5 ${i !== recentActivity.length - 1 ? "border-b border-line" : ""}`}
              >
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{a.title}</span>{" "}
                  <span className="text-ink-3">{a.detail}</span>
                </p>
                <span className="shrink-0 text-xs text-ink-3">
                  {a.at.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
