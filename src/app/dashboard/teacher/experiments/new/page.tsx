import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/page-session";
import { NavLink } from "@/app/NavLink";
import { PageHeader } from "../../../PageHeader";
import { ExperimentCreator } from "./ExperimentCreator";

export default async function NewExperimentPage() {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/student");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <PageHeader
        title="New experiment"
        subtitle="One complete package — it publishes immediately and becomes assignable."
      >
        <p className="mt-2 text-sm">
          <NavLink href="/dashboard/teacher/experiments" arrow="back">
            Experiments
          </NavLink>
        </p>
      </PageHeader>
      <ExperimentCreator />
    </main>
  );
}
