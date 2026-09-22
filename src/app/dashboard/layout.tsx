import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/page-session";
import { AppShell } from "./AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getPageUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT" && user.role !== "TEACHER") redirect("/");

  return (
    <AppShell role={user.role as "STUDENT" | "TEACHER"} name={user.name}>
      {children}
    </AppShell>
  );
}
