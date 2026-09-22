import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/page-session";
import { LogoutButton } from "../../LogoutButton";
import { ThemeToggle } from "../../ThemeToggle";

export default async function StudentDashboard() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard/teacher");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Student dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Welcome, {user.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <section aria-labelledby="assigned">
        <h2 id="assigned" className="text-lg font-medium">Assigned experiments</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Experiments your teachers assign will appear here. Nothing assigned yet.
        </p>
      </section>

      <section aria-labelledby="independent">
        <h2 id="independent" className="text-lg font-medium">Independent experiments</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Published experiments you can explore on your own will appear here.
        </p>
      </section>

      <section aria-labelledby="progress">
        <h2 id="progress" className="text-lg font-medium">Overall progress</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Completed and in-progress work will be summarized here.
        </p>
      </section>
    </main>
  );
}
