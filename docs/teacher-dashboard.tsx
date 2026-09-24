/**
 * TEACHER DASHBOARD — app/(teacher)/dashboard/page.tsx
 *
 * COMPONENT TREE
 * <TeacherShell>                                   sidebar + sticky header wrapper, shared across /(teacher)/*
 *   <TeacherSidebar />                              280px fixed / 72px rail (md) / Sheet drawer (base)
 *   <TeacherTopbar />                                sticky h-16, breadcrumb + search + "Assign Experiment"
 *   <main>
 *     <StatSummaryRow>                               4-up, dense, tight internal spacing
 *       <StatCard × 4 />
 *     </StatSummaryRow>
 *     <SplitRow>                                     2/3 + 1/3 — the asymmetric core of the page
 *       <ClassProgressPanel col-span-8>
 *         <ClassProgressRow × n />                    expandable, divider-separated
 *       </ClassProgressPanel>
 *       <NeedsAttentionPanel col-span-4>
 *         <StudentFlagRow × n />                      tinted rows, no nested borders
 *       </NeedsAttentionPanel>
 *     </SplitRow>
 *     <RecentActivityPanel col-span-12>               full-width, independently scrollable feed
 *       <ActivityRow × n />
 *     </RecentActivityPanel>
 *   </main>
 * </TeacherShell>
 *
 * INTERACTIVE ZONES
 * - Sticky: <TeacherTopbar> (top-0), <TeacherSidebar> nav list scrolls independently, identity block pinned bottom
 * - Scroll: <main> scrolls independently of sidebar/header; <RecentActivityPanel> has its own
 *           max-h-[420px] overflow-y-auto so a long feed never pushes the page's fold
 * - Fixed:  "Assign Experiment" lives in the topbar (desktop) → drops to fixed bottom bar (mobile)
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Settings,
  Search,
  Bell,
  Menu,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Realistic fixture data (stand-in for the query layer)
// ---------------------------------------------------------------------------

const stats = [
  { label: "Active classes", value: "4", delta: null },
  { label: "Students enrolled", value: "112", delta: "+6 this week" },
  { label: "Assignments to review", value: "9", delta: "3 overdue" },
  { label: "Avg. completion rate", value: "78%", delta: "+4% vs last week" },
];

const classes = [
  {
    name: "Grade 10A — Integrated Science",
    code: "SC10A-7X2K",
    students: 31,
    assigned: "Simple Electrical Circuit",
    completion: 82,
  },
  {
    name: "Grade 10B — Integrated Science",
    code: "SC10B-9Q4M",
    students: 28,
    assigned: "Titration of Acids and Bases",
    completion: 61,
  },
  {
    name: "Grade 9 — Physical Science",
    code: "PS9-3R8L",
    students: 26,
    assigned: "Simple Electrical Circuit",
    completion: 90,
  },
  {
    name: "Grade 11 — Chemistry Elective",
    code: "CH11-5T1N",
    students: 27,
    assigned: "Titration of Acids and Bases",
    completion: 44,
  },
];

const flagged = [
  { name: "Kwame Boateng", class: "Grade 10B", reason: "No activity in 6 days" },
  { name: "Efua Mensah", class: "Grade 11", reason: "Failed assessment ×2" },
  { name: "Yaw Owusu", class: "Grade 10B", reason: "Started but not submitted" },
  { name: "Adjoa Asante", class: "Grade 9", reason: "No activity in 4 days" },
];

const activity = [
  { who: "Ama Serwaa", what: "submitted results for", experiment: "Simple Electrical Circuit", when: "12m ago" },
  { who: "Kojo Antwi", what: "asked the AI helper a question during", experiment: "Titration of Acids and Bases", when: "38m ago" },
  { who: "Grade 10A", what: "class average crossed 80% on", experiment: "Simple Electrical Circuit", when: "2h ago" },
  { who: "Nana Yaa", what: "flagged a safety concern during", experiment: "Titration of Acids and Bases", when: "3h ago" },
];

// ---------------------------------------------------------------------------

export default function TeacherDashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TeacherTopbar />

        <main className="flex-1 overflow-y-auto p-8">
          {/* Macro section gap: gap-8 between unrelated blocks */}
          <div className="flex flex-col gap-8">
            <StatSummaryRow />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
              <ClassProgressPanel className="md:col-span-4 lg:col-span-8" />
              <NeedsAttentionPanel className="md:col-span-2 lg:col-span-4" />
            </div>

            <RecentActivityPanel />
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — fixed 280px / icon rail / drawer
// ---------------------------------------------------------------------------

function TeacherSidebar() {
  const nav = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "My Classes", icon: Users },
    { label: "Experiment Library", icon: BookOpen },
    { label: "Assignments", icon: ClipboardList },
    { label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className="hidden shrink-0 flex-col border-r border-border/60 bg-card md:flex md:w-[72px] lg:w-[280px]"
    >
      <div className="flex h-16 items-center border-b border-border/60 px-4 lg:px-6">
        <span className="hidden text-sm font-semibold tracking-tight lg:block">
          ScienceLab
        </span>
        <span className="text-sm font-semibold lg:hidden">SL</span>
      </div>

      {/* nav list scrolls independently from the identity block below */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {nav.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
              item.active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">{item.label}</span>
          </a>
        ))}
      </nav>

      {/* pinned identity block — mt-auto keeps it at the bottom regardless of nav length */}
      <div className="mt-auto flex items-center gap-3 border-t border-border/60 p-4">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-medium">Mr. Sarpong</p>
          <p className="truncate text-xs text-muted-foreground">Science Dept.</p>
        </div>
      </div>
    </aside>
  );
}

function TeacherSidebarDrawer() {
  // Mobile-only: same nav content, rendered inside a Sheet, triggered from the topbar
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        {/* re-render nav list here in the real build */}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Sticky topbar
// ---------------------------------------------------------------------------

function TeacherTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/90 px-4 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <TeacherSidebarDrawer />
        <h1 className="truncate text-base font-semibold">Dashboard</h1>
      </div>

      <div className="hidden flex-1 items-center gap-2 md:flex md:max-w-sm">
        <div className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
          <Search className="h-4 w-4 shrink-0" />
          <span>Search students, classes, experiments…</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        {/* the page's one primary commitment action — hidden on mobile, replaced by fixed bottom bar */}
        <Button className="hidden sm:inline-flex">Assign Experiment</Button>
        <div className="h-8 w-8 rounded-full bg-muted" />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Stat row — 4-up, dense internal spacing, generous gap between cards
// ---------------------------------------------------------------------------

function StatSummaryRow() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
            {s.delta && (
              <p className="text-xs text-muted-foreground">{s.delta}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primary column (8/12) — class progress list
// ---------------------------------------------------------------------------

function ClassProgressPanel({ className }: { className?: string }) {
  return (
    <Card className={`flex flex-col p-0 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border/50 p-5">
        <h2 className="text-sm font-semibold">Class progress</h2>
        <Button variant="ghost" size="sm" className="text-xs">
          View all classes
        </Button>
      </div>

      <div className="flex flex-col">
        {classes.map((c, i) => (
          <div
            key={c.code}
            className={`flex items-center gap-4 p-5 ${
              i !== classes.length - 1 ? "border-b border-border/50" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {c.students} students
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Assigned: {c.assigned}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${c.completion}%` }}
                />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">
                {c.completion}%
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Secondary column (4/12) — contextual, tinted rows, no nested borders
// ---------------------------------------------------------------------------

function NeedsAttentionPanel({ className }: { className?: string }) {
  return (
    <Card className={`flex flex-col p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Needs attention</h2>
        <Badge variant="destructive" className="text-[10px]">
          {flagged.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {flagged.map((f) => (
          <div
            key={f.name}
            className="flex items-center gap-3 rounded-md bg-muted/40 p-3"
          >
            <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">
                {f.name}
              </p>
              <p className="truncate text-xs text-muted-foreground leading-tight">
                {f.class} · {f.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Full-width feed — independently scrollable, capped height
// ---------------------------------------------------------------------------

function RecentActivityPanel() {
  return (
    <Card className="flex flex-col p-0">
      <div className="border-b border-border/50 p-5">
        <h2 className="text-sm font-semibold">Recent activity</h2>
      </div>
      <div className="flex max-h-[420px] flex-col overflow-y-auto">
        {activity.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 border-b border-border/40 px-5 py-3 last:border-b-0"
          >
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <p className="text-sm leading-snug">
              <span className="font-medium">{a.who}</span>{" "}
              <span className="text-muted-foreground">{a.what}</span>{" "}
              <span className="font-medium">{a.experiment}</span>
            </p>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {a.when}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Mobile fixed action bar — renders only when TeacherShell mounts on a
// base-width viewport; kept here for reference to the shared contract.
function MobileActionBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 p-4 backdrop-blur sm:hidden">
      <p className="text-xs text-muted-foreground">4 classes · 9 to review</p>
      <Button size="sm">Assign Experiment</Button>
    </div>
  );
}
