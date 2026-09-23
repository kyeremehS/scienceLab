import Link from "next/link";
import { NavLink } from "@/app/NavLink";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { PageHeader } from "../../PageHeader";
import { CreateClassForm } from "./CreateClassForm";

export default async function TeacherClassesPage() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  const owned = await db.select().from(classes).where(eq(classes.teacherId, user.id));
  const withCounts = await Promise.all(
    owned.map(async (c) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(classMemberships)
        .where(and(eq(classMemberships.classId, c.id), eq(classMemberships.active, true)));
      return { ...c, studentCount: value };
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <PageHeader
        title="Classes"
        subtitle="Share a class code so students can join."
      />

      <section aria-labelledby="class-list">
        <h2 id="class-list" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          YOUR CLASSES
        </h2>
        {withCounts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">No classes yet. Create your first class below.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {withCounts.map((c) => (
              <li key={c.id} className="rounded-lg border border-line bg-surface px-5 py-4">
                <Link
                  href={`/dashboard/teacher/classes/${c.id}`}
                  className="text-lg font-semibold underline"
                >
                  {c.name}
                </Link>
                {c.description ? (
                  <p className="mt-0.5 text-sm text-ink-2">{c.description}</p>
                ) : null}
                <p className="mt-2 text-sm text-ink-2">
                  {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-sm">
                    <span className="text-ink-3">Code </span>
                    <span className="font-mono font-semibold">{c.code}</span>
                  </p>
                  <NavLink
                    href={`/dashboard/teacher/classes/${c.id}`}
                    arrow="forward"
                  >
                    View class
                  </NavLink>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="create-class">
        <h2 id="create-class" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          CREATE A CLASS
        </h2>
        <p className="mt-2 max-w-[520px] text-sm text-ink-2">
          Set up a space for your students to perform and track experiments.
        </p>
        <div className="mt-3 max-w-[520px]">
          <CreateClassForm />
        </div>
      </section>
    </main>
  );
}
