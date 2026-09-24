/**
 * STUDENT DASHBOARD — app/(student)/dashboard/page.tsx
 *
 * COMPONENT TREE
 * <StudentShell>
 *   <StudentSidebar />                              280px / icon rail / drawer — same contract as teacher
 *   <StudentTopbar />                                sticky, greeting + streak, no search (lower info density)
 *   <main>
 *     <ContinueAndGoalRow>                            asymmetric 2/3 + 1/3 — the hero row
 *       <ContinueCard col-span-8 />                    large — resumes the in-progress experiment
 *       <WeeklyGoalCard col-span-4 />                  small — progress ring, quiet by comparison
 *     </ContinueAndGoalRow>
 *     <AssignedSection>                                horizontally scrollable — teacher-assigned work
 *       <AssignedExperimentCard × n />                  tight gap-3 between due-date badge and title
 *     </AssignedSection>
 *     <CatalogueSection>                               full grid — self-directed exploration
 *       <FilterChipRow />                               gap-2, tight
 *       <ExperimentCard × n />                           3-up grid, generous gap-6
 *     </CatalogueSection>
 *   </main>
 * </StudentShell>
 *
 * INTERACTIVE ZONES
 * - Sticky: <StudentTopbar> (top-0)
 * - Scroll: <main> scrolls as a whole; <AssignedSection> has its own horizontal
 *           overflow-x-auto scroller independent of the page's vertical scroll
 * - Fixed:  none page-level — the dashboard has no single commitment action;
 *           each card carries its own inline CTA instead
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Compass,
  TrendingUp,
  Award,
  HelpCircle,
  Flame,
} from "lucide-react";

const assigned = [
  { title: "Titration of Acids and Bases", by: "Mr. Sarpong · Grade 10B", due: "Due tomorrow", status: "in_progress" },
  { title: "Simple Electrical Circuit", by: "Mr. Sarpong · Grade 10B", due: "Due Fri, 27 Sep", status: "not_started" },
  { title: "Measuring pH of Household Liquids", by: "Ms. Owusu · Grade 10B", due: "Due Mon, 30 Sep", status: "not_started" },
];

const catalogue = [
  { title: "Simple Electrical Circuit", subject: "Physics", level: "Beginner", minutes: 35 },
  { title: "Titration of Acids and Bases", subject: "Chemistry", level: "Intermediate", minutes: 50 },
  { title: "Germination and Plant Growth", subject: "Biology", level: "Beginner", minutes: 40 },
  { title: "Newton's Second Law with a Cart", subject: "Physics", level: "Intermediate", minutes: 45 },
  { title: "Density of Regular and Irregular Solids", subject: "Chemistry", level: "Beginner", minutes: 30 },
  { title: "Osmosis in Potato Strips", subject: "Biology", level: "Intermediate", minutes: 55 },
];

const filters = ["All subjects", "Physics", "Chemistry", "Biology", "Beginner", "Intermediate"];

export default function StudentDashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <StudentSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <StudentTopbar />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-6 lg:grid-cols-12">
              <ContinueCard className="md:col-span-4 lg:col-span-8" />
              <WeeklyGoalCard className="md:col-span-2 lg:col-span-4" />
            </div>

            <AssignedSection />
            <CatalogueSection />
          </div>
        </main>
      </div>
    </div>
  );
}

function StudentSidebar() {
  const nav = [
    { label: "My Experiments", icon: FlaskConical, active: true },
    { label: "Catalogue", icon: Compass },
    { label: "Progress", icon: TrendingUp },
    { label: "Achievements", icon: Award },
    { label: "Help", icon: HelpCircle },
  ];
  return (
    <aside className="hidden shrink-0 flex-col border-r border-border/60 bg-card md:flex md:w-[72px] lg:w-[280px]">
      <div className="flex h-16 items-center border-b border-border/60 px-4 lg:px-6">
        <span className="hidden text-sm font-semibold tracking-tight lg:block">ScienceLab</span>
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
      <div className="mt-auto flex items-center gap-3 border-t border-border/60 p-4">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-medium">Ama Serwaa</p>
          <p className="truncate text-xs text-muted-foreground">Grade 10B</p>
        </div>
      </div>
    </aside>
  );
}

function StudentTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur lg:px-8">
      <h1 className="text-base font-semibold">Welcome back, Ama</h1>
      <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600">
        <Flame className="h-3.5 w-3.5" />
        <span>6-day streak</span>
      </div>
    </header>
  );
}

// Hero: dominant, large card — the one thing the student should notice first
function ContinueCard({ className }: { className?: string }) {
  return (
    <Card className={`flex flex-col justify-between gap-6 p-6 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Continue where you left off</p>
          <h2 className="mt-1 text-lg font-semibold">Titration of Acids and Bases</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Step 4 of 9 — Recording observations
          </p>
        </div>
        <Badge className="shrink-0">In progress</Badge>
      </div>
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[44%] rounded-full bg-primary" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">44% complete</span>
          <Button size="sm">Resume experiment</Button>
        </div>
      </div>
    </Card>
  );
}

// Secondary: quiet by comparison, smaller footprint
function WeeklyGoalCard({ className }: { className?: string }) {
  return (
    <Card className={`flex flex-col items-center justify-center gap-3 p-6 text-center ${className ?? ""}`}>
      <p className="text-xs text-muted-foreground">This week's goal</p>
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/20">
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent rotate-45" />
        <span className="text-sm font-semibold">2 / 3</span>
      </div>
      <p className="text-xs text-muted-foreground">experiments completed</p>
    </Card>
  );
}

// Horizontally-scrollable row, independent of page scroll
function AssignedSection() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Assigned by your teacher</h2>
        <span className="text-xs text-muted-foreground">{assigned.length} active</span>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {assigned.map((a) => (
          <Card key={a.title} className="w-[260px] shrink-0 p-4">
            <div className="flex items-center gap-2">
              <Badge
                variant={a.status === "in_progress" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {a.status === "in_progress" ? "In progress" : "Not started"}
              </Badge>
              <span className="truncate text-[11px] text-muted-foreground">{a.due}</span>
            </div>
            <p className="mt-3 text-sm font-medium leading-snug">{a.title}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{a.by}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CatalogueSection() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Explore the catalogue</h2>
      </div>

      {/* tight gap-2: these chips are one cognitive unit */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f, i) => (
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

      {/* generous gap-6: unrelated cards in a browsing grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {catalogue.map((c) => (
          <Card key={c.title} className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{c.subject}</Badge>
              <Badge variant="outline" className="text-[10px]">{c.level}</Badge>
            </div>
            <p className="text-sm font-medium leading-snug">{c.title}</p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">~{c.minutes} min</span>
              <Button variant="ghost" size="sm" className="text-xs">
                View details
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
