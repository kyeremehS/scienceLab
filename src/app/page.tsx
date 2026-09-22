import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/page-session";
import { ThemeToggle } from "./ThemeToggle";

export default async function Home() {
  const user = await getPageUser();
  if (user) {
    redirect(user.role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student");
  }

  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <p className="text-sm font-semibold tracking-[0.2em] text-zinc-500">SCIENCELAB</p>
      <h1 className="text-4xl font-semibold tracking-tight">Learn science by doing.</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Understand, prepare, perform, observe, reflect, and assess —
        practical experiments with structured digital guidance.
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-solid border-black/[.08] px-6 py-3 text-sm font-medium dark:border-white/[.145]"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
