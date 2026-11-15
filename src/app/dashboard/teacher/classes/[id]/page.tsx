import Link from "next/link";
import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assignments, classes, classMemberships, experimentAttempts, users } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { Badge, type BadgeTone } from "@/app/ui/Badge";
import { Card } from "@/app/ui/Card";
import { EmptyState } from "../../../EmptyState";
import { CopyCodeButton } from "./CopyCodeButton";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { ClassTabs, type ClassTab } from "./ClassTabs";
import { AssignmentsManager } from "./AssignmentsManager";
import { ClassProgress } from "./ClassProgress";

/** Spec status pills (p6): warm Not started, neutral In progress, pale teal Done. */
const STATUS: Record<
  "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
  { label: string; tone: BadgeTone }
> = {
  NOT_STARTED: { label: "Not started", tone: "pending" },
  IN_PROGRESS: { label: "In progress", tone: "neutral" },
  COMPLETED: { label: "Done", tone: "done" },
};

const TAB_IDS: readonly ClassTab[] = ["students", "assignments", "progress"];

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab: ClassTab =
    tab && (TAB_IDS as readonly string[]).includes(tab) ? (tab as ClassTab) : "students";

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

  const [{ value: assignmentCount }] = await db
    .select({ value: count() })
    .from(assignments)
    .where(eq(assignments.classId, id));
  const [{ value: activeAssignmentCount }] = await db
    .select({ value: count() })
    .from(assignments)
    .where(and(eq(assignments.classId, id), eq(assignments.status, "ACTIVE")));

  // Spec p6: per-student status pill + bar, and the Class completion tile,
  // both derived from this class's active assignments and the members'
  // attempts on them (never set by hand — FR-TEA-25).
  const activeAssignmentRows =
    activeAssignmentCount === 0
      ? []
      : await db
          .select({ experimentId: assignments.experimentId })
          .from(assignments)
          .where(and(eq(assignments.classId, id), eq(assignments.status, "ACTIVE")));
  const activeExperimentIds = [...new Set(activeAssignmentRows.map((a) => a.experimentId))];
  const memberIds = members.map((m) => m.studentId);
  const attempts =
    activeExperimentIds.length === 0 || memberIds.length === 0
      ? []
      : await db
          .select({
            studentId: experimentAttempts.studentId,
            experimentId: experimentAttempts.experimentId,
            status: experimentAttempts.status,
          })
          .from(experimentAttempts)
          .where(
            and(
              inArray(experimentAttempts.studentId, memberIds),
              inArray(experimentAttempts.experimentId, activeExperimentIds),
            ),
          );

  const completedByStudent = new Map<string, Set<string>>();
  const touchedByStudent = new Map<string, Set<string>>();
  for (const a of attempts) {
    const touched = touchedByStudent.get(a.studentId) ?? new Set<string>();
    touched.add(a.experimentId);
    touchedByStudent.set(a.studentId, touched);
    if (a.status === "COMPLETED") {
      const done = completedByStudent.get(a.studentId) ?? new Set<string>();
      done.add(a.experimentId);
      completedByStudent.set(a.studentId, done);
    }
  }

  const assignmentTotal = activeExperimentIds.length;
  const studentStatus = new Map<
    string,
    { status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null; pct: number | null }
  >();
  for (const m of members) {
    const done = completedByStudent.get(m.studentId)?.size ?? 0;
    const touched = touchedByStudent.get(m.studentId)?.size ?? 0;
    studentStatus.set(m.studentId, {
      status:
        assignmentTotal === 0
          ? null
          : done === assignmentTotal
            ? "COMPLETED"
            : touched > 0
              ? "IN_PROGRESS"
              : "NOT_STARTED",
      pct: assignmentTotal === 0 ? null : Math.round((done / assignmentTotal) * 100),
    });
  }

  const completedPairs = [...completedByStudent.values()].reduce((sum, set) => sum + set.size, 0);
  const totalPairs = members.length * assignmentTotal;
  const classCompletionPct = totalPairs === 0 ? null : Math.round((completedPairs / totalPairs) * 100);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
        <Link
          href="/dashboard/teacher/classes"
          className="transition-colors duration-150 hover:text-accent-ink"
        >
          Classes
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-ink">{row.name}</span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">
          {row.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-teal-pale px-4 py-2 text-sm font-semibold text-teal-ink dark:bg-teal/20 dark:text-teal-pale">
            Class code: <span className="font-mono">{row.code}</span>
          </span>
          <Link
            href={`/dashboard/teacher/classes/${id}?tab=assignments`}
            className="rounded-btn bg-orange px-7 py-[15px] text-[16px] font-semibold text-white transition-colors duration-150 hover:bg-orange-hover"
          >
            New assignment
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <ClassTabs
            counts={{ students: members.length, assignments: assignmentCount, progress: null }}
            initialTab={initialTab}
            students={
              members.length === 0 ? (
                <EmptyState
                  title="No students yet"
                  body="Share your class code with students to invite them into this class."
                  action={<CopyCodeButton code={row.code} />}
                />
              ) : (
                <section aria-labelledby="students-heading">
                  <h2
                    id="students-heading"
                    className="border-b border-line pb-4 font-display text-lg font-semibold tracking-tight"
                  >
                    Students
                  </h2>
                  <ul>
                    {members.map((m) => {
                      const s = studentStatus.get(m.studentId) ?? { status: null, pct: null };
                      return (
                        <li
                          key={m.studentId}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                        >
                          <div className="col-span-2 min-w-0 sm:col-span-1">
                            <p className="truncate text-sm font-semibold">{m.studentName}</p>
                            <p className="truncate text-xs text-ink-3">
                              Joined {new Date(m.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 sm:justify-self-center">
                            {s.status ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="h-1.5 w-24 overflow-hidden rounded-full bg-raised sm:w-40"
                                >
                                  <span
                                    className="block h-full rounded-full bg-teal"
                                    style={{ width: `${s.pct ?? 0}%` }}
                                  />
                                </span>
                                <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                              </>
                            ) : null}
                          </div>
                          <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-self-end">
                            <NavLink href={`/dashboard/teacher/classes/${id}/students/${m.studentId}`}>
                              Progress
                            </NavLink>
                            <RemoveMemberButton
                              classId={id}
                              studentId={m.studentId}
                              studentName={m.studentName}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )
            }
            assignments={<AssignmentsManager classId={id} />}
            progress={<ClassProgress classId={id} />}
          />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <section aria-labelledby="invite-students">
            <Card>
              <h2 id="invite-students" className="font-display text-lg font-semibold tracking-tight">
                Invite students
              </h2>
              <p className="mt-2 text-sm text-ink-2">
                Share the class code. Students join on their own.
              </p>
              <div className="mt-4">
                <CopyCodeButton code={row.code} variant="action" />
              </div>
            </Card>
          </section>

          <section aria-labelledby="class-completion">
            <Card>
              <p className="font-display text-3xl font-semibold tracking-tight">
                {classCompletionPct === null ? "—" : `${classCompletionPct}%`}
              </p>
              <p id="class-completion" className="mt-1 text-sm text-ink-2">
                Class completion
              </p>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
