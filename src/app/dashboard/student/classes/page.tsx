import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships, users } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../PageHeader";
import { JoinClassForm } from "../JoinClassForm";

/** Student's classes: joined list plus the code form (sidebar: My Classes). */
export default async function StudentClassesPage() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard/teacher");

  const joined = await db
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
    .where(and(eq(classMemberships.studentId, user.id), eq(classMemberships.active, true)));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <PageHeader
        title="My classes"
        subtitle="Classes you have joined. New code from a teacher? Join below."
      />

      <section aria-labelledby="joined">
        <h2 id="joined" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          JOINED ({joined.length})
        </h2>
        {joined.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">
            You haven&apos;t joined a class yet — paste your teacher&apos;s code below.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {joined.map((c) => (
              <li key={c.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <p className="text-base font-semibold">
                  <Link
                    href={`/dashboard/student/classes/${c.id}`}
                    className="underline decoration-line underline-offset-4 hover:text-accent-ink"
                  >
                    {c.name}
                  </Link>
                </p>
                {c.description ? (
                  <p className="mt-0.5 text-sm text-ink-2">{c.description}</p>
                ) : null}
                <p className="mt-1 text-sm text-ink-3">
                  {c.teacherName} · joined {new Date(c.joinedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="join">
        <h2 id="join" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          JOIN WITH A CODE
        </h2>
        <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-3">
          <JoinClassForm compact />
        </div>
      </section>
    </main>
  );
}
