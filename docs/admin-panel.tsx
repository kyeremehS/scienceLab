/**
 * ADMIN PANEL — app/(admin)/users/page.tsx
 *
 * MVP scope keeps admin "intentionally minimal" (per docs/PRODUCT.md), so
 * this layout is deliberately plainer than the two dashboards: one
 * dense table as the entire content area, a filter row above it, and a
 * *contextual* action bar that only appears once rows are selected —
 * rather than a permanent one, since bulk actions aren't a persistent need.
 *
 * COMPONENT TREE
 * <AdminShell>
 *   <AdminSidebar />                                 280px, fewer items than teacher/student — Users,
 *                                                     Classes Overview, Content Moderation, System Health
 *   <AdminTopbar />                                   sticky, page title + "Invite user"
 *   <main>
 *     <FilterRow>                                      tight gap-2 — role filter, status filter, search
 *     <UsersTable col-span-12>
 *       <TableHeaderRow />
 *       <UserRow × n />                                 zebra-free, divider-separated, truncating cells
 *       <PaginationFooter />
 *     </UsersTable>
 *   </main>
 *   <SelectionActionBar />                             fixed, appears only when rows are selected
 * </AdminShell>
 *
 * INTERACTIVE ZONES
 * - Sticky: <AdminTopbar> (top-0)
 * - Scroll: the table body scrolls horizontally (overflow-x-auto) independently
 *           on narrow viewports, so columns never force the whole page to
 *           scroll sideways; vertically, <main> scrolls as a whole (table is
 *           not height-capped — admin tables are long by nature, pagination
 *           handles length instead of an inner scroll box)
 * - Fixed:  <SelectionActionBar> — conditionally fixed to the bottom, only
 *           rendered when selectedCount > 0, so it never competes for
 *           attention with the page's default (empty-selection) state
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  School,
  ShieldAlert,
  Activity,
  Search,
  MoreHorizontal,
} from "lucide-react";

const users = [
  { name: "Kwame Boateng", email: "k.boateng@stu.school.edu.gh", role: "Student", status: "Active", classes: "Grade 10B" },
  { name: "Mr. Sarpong", email: "d.sarpong@school.edu.gh", role: "Teacher", status: "Active", classes: "Grade 10A, 10B, 9" },
  { name: "Efua Mensah", email: "e.mensah@stu.school.edu.gh", role: "Student", status: "Suspended", classes: "Grade 11" },
  { name: "Ms. Owusu", email: "a.owusu@school.edu.gh", role: "Teacher", status: "Active", classes: "Grade 10B" },
  { name: "Yaw Owusu", email: "y.owusu@stu.school.edu.gh", role: "Student", status: "Pending", classes: "Grade 10B" },
];

const stats = [
  { label: "Total users", value: "1,204", icon: Users },
  { label: "Classes", value: "38", icon: School },
  { label: "Content flags", value: "3", icon: ShieldAlert },
  { label: "System status", value: "Operational", icon: Activity },
];

export default function AdminUsersPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col gap-8">
            <StatSummaryRow />

            <Card className="flex flex-col p-0">
              <FilterRow />
              <UsersTable />
            </Card>
          </div>
        </main>
      </div>

      {/* rendered conditionally when a real selection state exists */}
      <SelectionActionBar selectedCount={2} />
    </div>
  );
}

function AdminSidebar() {
  const nav = [
    { label: "Users", icon: Users, active: true },
    { label: "Classes Overview", icon: School },
    { label: "Content Moderation", icon: ShieldAlert },
    { label: "System Health", icon: Activity },
  ];
  return (
    <aside className="hidden shrink-0 flex-col border-r border-border/60 bg-card md:flex md:w-[72px] lg:w-[280px]">
      <div className="flex h-16 items-center border-b border-border/60 px-4 lg:px-6">
        <span className="hidden text-sm font-semibold tracking-tight lg:block">ScienceLab Admin</span>
        <span className="text-sm font-semibold lg:hidden">SL</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {nav.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
              item.active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

function AdminTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur lg:px-8">
      <h1 className="text-base font-semibold">Users</h1>
      <Button size="sm">Invite user</Button>
    </header>
  );
}

function StatSummaryRow() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {stats.map((s) => (
        <Card key={s.label} className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <s.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{s.value}</p>
            <p className="truncate text-xs text-muted-foreground">{s.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Tight gap-2: filters are one cognitive cluster, distinct from the table below (p-4 vs border separation)
function FilterRow() {
  const roleFilters = ["All roles", "Students", "Teachers", "Admins"];
  return (
    <div className="flex flex-col gap-3 border-b border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {roleFilters.map((f, i) => (
          <button
            key={f}
            className={`rounded-full border px-3 py-1 text-xs ${
              i === 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground sm:w-64">
        <Search className="h-4 w-4 shrink-0" />
        <span>Search by name or email…</span>
      </div>
    </div>
  );
}

function UsersTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
            <th className="w-10 px-4 py-3">
              <Checkbox />
            </th>
            <th className="px-2 py-3 font-medium">Name</th>
            <th className="px-2 py-3 font-medium">Role</th>
            <th className="px-2 py-3 font-medium">Classes</th>
            <th className="px-2 py-3 font-medium">Status</th>
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr
              key={u.email}
              className={i !== users.length - 1 ? "border-b border-border/40" : ""}
            >
              <td className="px-4 py-3">
                <Checkbox />
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground leading-tight">
                      {u.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-2 py-3 text-muted-foreground">{u.role}</td>
              <td className="max-w-[180px] truncate px-2 py-3 text-muted-foreground">
                {u.classes}
              </td>
              <td className="px-2 py-3">
                <Badge
                  variant={
                    u.status === "Active"
                      ? "default"
                      : u.status === "Suspended"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-[10px]"
                >
                  {u.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">
        <span>Showing 1–5 of 1,204</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Previous</Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Next</Button>
        </div>
      </div>
    </div>
  );
}

// Conditionally fixed — only takes up interactive real estate when relevant
function SelectionActionBar({ selectedCount }: { selectedCount: number }) {
  if (selectedCount === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:left-[280px] lg:px-8">
      <p className="text-sm">
        <span className="font-medium">{selectedCount}</span> users selected
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">Suspend</Button>
        <Button variant="destructive" size="sm">Remove</Button>
      </div>
    </div>
  );
}
