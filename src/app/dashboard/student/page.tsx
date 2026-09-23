import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships, users } from "@/db/schema";
import { experimentSteps, experimentVersions } from "@/db/schema";
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
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
