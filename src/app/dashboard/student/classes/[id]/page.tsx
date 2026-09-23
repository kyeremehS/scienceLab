import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  classes,
  classMemberships,
  experimentVersions,
  users,
} from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../../PageHeader";

/** Student class detail: own class info plus its assigned experiments. */
export default async function StudentClassPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard/teacher");

  const { id } = await params;

  // Only classes this student actively belongs to (FR-STU-32).
  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      teacherName: users.name,
      joinedAt: classMemberships.joinedAt,
    })
    .from(classMemberships)
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .innerJoin(users, eq(users.id, classes.teacherId))
    .where(
      and(
        eq(classMemberships.classId, id),
        eq(classMemberships.studentId, user.id),
        eq(classMemberships.active, true),
      ),
    )
    .limit(1);
  const cls = rows[0];
  if (!cls) redirect("/dashboard/student/classes");

  const assigned = await db
    .select({
      id: assignments.id,
      experimentId: assignments.experimentId,
      title: experimentVersions.title,
      topic: experimentVersions.topic,
      difficulty: experimentVersions.difficulty,
      dueAt: assignments.dueAt,
    })
    .from(assignments)
    .innerJoin(experimentVersions, eq(experimentVersions.id, assignments.experimentVersionId))
    .where(and(eq(assignments.classId, id), eq(assignments.status, "ACTIVE")));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <PageHeader title={cls.name} subtitle={cls.description ?? undefined}>
        <p className="mt-2 text-sm">
          <NavLink href="/dashboard/student/classes" arrow="back">
            My classes
          </NavLink>
        </p>
      </PageHeader>

      <dl
        aria-label="Class facts"
        className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface px-5 py-4"
      >
        {[
          ["TEACHER", cls.teacherName],
          ["JOINED", new Date(cls.joinedAt).toLocaleDateString()],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-xs text-ink-3">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="assigned">
        <h2 id="assigned" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          ASSIGNED EXPERIMENTS ({assigned.length})
        </h2>
        {assigned.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">
            No assigned experiments yet — they appear here when your teacher assigns them
            (teacher assignments arrive with Phase 7).
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {assigned.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.15em] text-ink-3">
                  {a.topic.toUpperCase()} · {a.difficulty.toUpperCase()}
                </p>
                <p className="mt-1 text-base font-semibold">{a.title}</p>
                {a.dueAt ? (
                  <p className="mt-0.5 text-sm text-ink-3">
                    Due {new Date(a.dueAt).toLocaleDateString()}
                  </p>
                ) : null}
                <p className="mt-2">
                  <NavLink
                    href={`/dashboard/student/experiments/${a.experimentId}`}
                    arrow="forward"
                  >
                    View experiment
                  </NavLink>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
