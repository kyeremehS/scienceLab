import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships, users } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../../PageHeader";
import { EmptyState } from "../../../EmptyState";
import { CopyCodeButton } from "./CopyCodeButton";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { ClassTabs } from "./ClassTabs";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  const { id } = await params;
  const found = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  const row = found[0];
  if (!row || row.teacherId !== user.id) {
    redirect("/dashboard/teacher/classes");
  }

  const members = await db
    .select({
      studentId: classMemberships.studentId,
      studentName: users.name,
      joinedAt: classMemberships.joinedAt,
    })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.studentId))
    .where(and(eq(classMemberships.classId, id), eq(classMemberships.active, true)));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <PageHeader title={row.name} subtitle={row.description ?? "Class workspace"}>
        <p className="mt-2 text-sm">
          <NavLink href="/dashboard/teacher/classes" arrow="back">
            Classes
          </NavLink>
        </p>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-line bg-surface px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold">{members.length}</span>{" "}
          <span className="text-ink-2">student{members.length === 1 ? "" : "s"}</span>
        </p>
        <p className="text-sm">
          <span className="font-semibold">0</span>{" "}
          <span className="text-ink-2">active assignments</span>
        </p>
        <span className="ml-auto">
          <CopyCodeButton code={row.code} />
        </span>
      </div>

      <ClassTabs
        counts={{ overview: null, students: members.length, assignments: 0 }}
        overview={
          <div className="flex flex-col gap-6">
            <section aria-labelledby="class-code">
              <h2 id="class-code" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
                CLASS CODE
              </h2>
              <p className="mt-2 text-sm text-ink-2">Share this code so students can join.</p>
              <div className="mt-2">
                <CopyCodeButton code={row.code} />
              </div>
            </section>
            <section aria-labelledby="about">
              <h2 id="about" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
                ABOUT
              </h2>
              <p className="mt-2 text-sm text-ink-2">
                {row.description ?? "A space for students to perform and track experiments."}
              </p>
            </section>
          </div>
        }
        students={
          <div>
            {members.length === 0 ? (
              <EmptyState
                title="No students yet"
                body="Share your class code with students to invite them into this class."
                action={<CopyCodeButton code={row.code} />}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {members.map((m) => (
                  <li key={m.studentId} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3">
                    <div>
                      <p className="font-medium">{m.studentName}</p>
                      <p className="text-sm text-ink-3">
                        Joined {new Date(m.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <RemoveMemberButton classId={id} studentId={m.studentId} studentName={m.studentName} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
        assignments={
          <div className="rounded-lg border border-line bg-surface px-4 py-6 text-center">
            <p className="font-medium">No assignments yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">
              Assign a published experiment to give this class work. Assignment
              management arrives with Phase 7.
            </p>
          </div>
        }
      />
    </main>
  );
}
