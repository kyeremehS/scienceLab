import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/page-session";
import { LogoutButton } from "../../LogoutButton";
import { ThemeToggle } from "../../ThemeToggle";

export default async function TeacherDashboard() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teacher dashboard</h1>
          <p className="text-ink-2">Welcome, {user.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <section aria-labelledby="classes">
        <h2 id="classes" className="text-lg font-medium">Classes</h2>
        <p className="mt-2 text-sm text-ink-2">
          Classes you create will appear here. Class creation arrives in the next slice.
        </p>
      </section>

      <section aria-labelledby="assignments">
        <h2 id="assignments" className="text-lg font-medium">Active assignments</h2>
        <p className="mt-2 text-sm text-ink-2">
          Experiments you assign to your classes will appear here.
        </p>
      </section>

      <section aria-labelledby="activity">
        <h2 id="activity" className="text-lg font-medium">Class activity</h2>
        <p className="mt-2 text-sm text-ink-2">
          Recent student activity across your classes will appear here.
        </p>
      </section>
    </main>
  );
}
