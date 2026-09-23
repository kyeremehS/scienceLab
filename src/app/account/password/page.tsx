import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/page-session";
import { NavLink } from "@/app/NavLink";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getPageUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Change password</h1>
        <p className="mt-1 text-sm text-ink-2">Signed in as {user.email}.</p>
        <p className="mt-2 text-sm">
          <NavLink
            href={user.role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student"}
            arrow="back"
          >
            Dashboard
          </NavLink>
        </p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
