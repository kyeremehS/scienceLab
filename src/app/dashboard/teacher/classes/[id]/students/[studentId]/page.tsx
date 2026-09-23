import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, classMemberships, users } from "@/db/schema";
import { getPageUser } from "@/lib/page-session";
import { NavLink } from "@/app/NavLink";
import { PageHeader } from "../../../../../PageHeader";
import { StudentProgressView } from "./StudentProgressView";

export default async function TeacherStudentProgressPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  const { id, studentId } = await params;
  const found = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  const row = found[0];
  if (!row || row.teacherId !== user.id) redirect("/dashboard/teacher/classes");

  const membership = await db
    .select({ studentName: users.name })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.studentId))
    .where(
      and(
        eq(classMemberships.classId, id),
        eq(classMemberships.studentId, studentId),
        eq(classMemberships.active, true),
      ),
    )
    .limit(1);
  if (membership.length === 0) redirect(`/dashboard/teacher/classes/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <PageHeader title={membership[0].studentName} subtitle={`Progress in ${row.name}`}>
        <p className="mt-2 text-sm">
          <NavLink href={`/dashboard/teacher/classes/${id}`} arrow="back">
            {row.name}
          </NavLink>
        </p>
      </PageHeader>
      <StudentProgressView classId={id} studentId={studentId} />
    </main>
  );
}
