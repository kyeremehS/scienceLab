import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships, users } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../PageHeader";
import { JoinClassDialog } from "./JoinClassDialog";
import { JoinedClassRow } from "./JoinedClassRow";

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
        subtitle="Classes you have joined."
      />
      <div>
        <JoinClassDialog />
      </div>

      <section aria-labelledby="joined">
        <h2 id="joined" className="text-sm font-medium text-ink-2">
          Joined ({joined.length})
        </h2>
        {joined.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">
            You haven&apos;t joined a class yet — paste your teacher&apos;s code below.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {joined.map((c) => (
              <JoinedClassRow key={c.id} classInfo={c} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
