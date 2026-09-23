import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assignments, classes, classMemberships, users } from "@/db/schema";
import { experimentVersions } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { Hero, StatCards } from "../Hero";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function TeacherDashboard() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  const owned = await db.select().from(classes).where(eq(classes.teacherId, user.id));
  const withMembers = await Promise.all(
    owned.map(async (c) => {
      const members = await db
        .select({
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
  const [{ value: publishedCount }] = await db
    .select({ value: count() })
    .from(experimentVersions)
    .where(eq(experimentVersions.status, "PUBLISHED"));
  const ownedIds = owned.map((c) => c.id);
  const [{ value: activeAssignmentCount }] =
    ownedIds.length === 0
      ? [{ value: 0 }]
      : await db
          .select({ value: count() })
          .from(assignments)
          .where(and(inArray(assignments.classId, ownedIds), eq(assignments.status, "ACTIVE")));

  const firstName = user.name.split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const recentJoins = withMembers
    .flatMap((c) =>
      c.members.map((m) => ({ ...m, className: c.name })),
    )
    .sort((a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt))
    .slice(0, 5);

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
          { value: String(publishedCount), label: "Published experiments" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="class-overview" className="lg:col-span-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="class-overview" className="text-base font-semibold tracking-tight">
              Your classes
            </h2>
            <NavLink href="/dashboard/teacher/classes" className="shrink-0">
              Manage classes
            </NavLink>
          </div>
          {withMembers.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">
              No classes yet.{" "}
              <NavLink href="/dashboard/teacher/classes">
                Create your first class
              </NavLink>{" "}
              and share its code so students can join.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {withMembers.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block font-mono text-xs text-ink-3">
                      {c.members.length} student{c.members.length === 1 ? "" : "s"} · {c.code}
                    </span>
                  </span>
                  <NavLink
                    href={`/dashboard/teacher/classes/${c.id}`}
                    arrow="forward"
                    className="shrink-0"
                  >
                    Open
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-joins" className="h-fit rounded-xl border border-line bg-surface p-5">
          <h2 id="recent-joins" className="text-base font-semibold tracking-tight">
            Recent joins
          </h2>
          {recentJoins.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">
              New students appear here as they join with your class codes.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {recentJoins.map((m) => (
                <li key={`${m.className}-${m.studentName}`} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-accent-ink"
                  >
                    {initials(m.studentName)}
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium">{m.studentName}</span>
                    <span className="block truncate text-xs text-ink-3">{m.className}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
