/**
 * EXPERIMENT WORKSPACE — app/(student)/experiments/[id]/run/page.tsx
 *
 * The core learning loop lives here (Learn → Perform → Observe → Reflect →
 * Assess → Improve), so this layout departs the most from the two
 * dashboards: three independently-scrolling verticals instead of a
 * sidebar+grid, because the student needs the step list, the task, and
 * help/notes visible *simultaneously*, not scrolled between.
 *
 * COMPONENT TREE
 * <ExperimentShell>
 *   <ExperimentTopbar />                             sticky, title + "Step 4 of 9" + Exit
 *   <div grid>
 *     <StepRail col-span-2 lg:w-[240px]>              sticky, own scroll, checkmarked steps
 *       <StepListItem × 9 />
 *     </StepRail>
 *     <StepContent flex-1>                             the actual task — scrolls independently
 *       <StepHeader />                                  eyebrow ("Step 4 of 9") + title + est. time
 *       <StepBody />                                     instructions, image, observation inputs
 *     </StepContent>
 *     <HelpRail w-[320px]>                              sticky, tabs: AI Help / Notes / Materials
 *       <RailTabs />
 *       <AIHelpPanel />  |  <NotesPanel />  |  <MaterialsPanel />
 *     </HelpRail>
 *   </div>
 *   <BottomActionBar />                                fixed, Previous / Save & Continue — always reachable
 * </ExperimentShell>
 *
 * INTERACTIVE ZONES
 * - Sticky: <ExperimentTopbar> (top-0); <StepRail> and <HelpRail> are each
 *           `sticky top-16` (offset by header height) with their own
 *           `overflow-y-auto` — three independent scroll containers side by side
 * - Scroll: <StepContent> is the only region that grows with content; it
 *           scrolls under the fixed bottom bar (padding-bottom reserves space)
 * - Fixed:  <BottomActionBar> — the one non-negotiable action (Save & Continue)
 *           must be reachable regardless of scroll position or step length
 *
 * RESPONSIVE
 * - < 768px: StepRail and HelpRail both collapse into Sheet drawers,
 *   triggered by icon buttons in the topbar ("Steps" / "Help"). StepContent
 *   becomes the entire viewport width. BottomActionBar remains fixed.
 * - md: HelpRail collapses to a slide-over triggered by a floating button;
 *   StepRail stays visible as a narrow 64px rail (numbers only, no labels).
 * - lg+: full three-column layout as specified.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Sparkles, NotebookPen, ListChecks, ChevronLeft } from "lucide-react";

const steps = [
  { label: "Introduction", done: true },
  { label: "Learning objectives", done: true },
  { label: "Materials & safety", done: true },
  { label: "Set up the circuit", done: false, current: true },
  { label: "Record observations", done: false },
  { label: "Troubleshooting", done: false },
  { label: "Reflection", done: false },
  { label: "Assessment", done: false },
  { label: "Result", done: false },
];

export default function ExperimentWorkspacePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ExperimentTopbar />

      <div className="flex flex-1">
        <StepRail />
        <StepContent />
        <HelpRail />
      </div>

      <BottomActionBar />
    </div>
  );
}

function ExperimentTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/95 px-4 backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <ListChecks className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Simple Electrical Circuit</p>
          <p className="text-xs text-muted-foreground">Step 4 of 9 — Set up the circuit</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Sparkles className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          <X className="mr-1.5 h-3.5 w-3.5" />
          Exit
        </Button>
      </div>
    </header>
  );
}

// Independently-scrolling step list — offset below the 64px header
function StepRail() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[240px] shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-card p-4 lg:flex">
      <p className="mb-3 px-2 text-xs font-medium text-muted-foreground">
        Experiment steps
      </p>
      <div className="flex flex-col gap-0.5">
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${
              s.current ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                s.done
                  ? "bg-primary text-primary-foreground"
                  : s.current
                    ? "border-2 border-primary"
                    : "border border-border"
              }`}
            >
              {s.done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="truncate">{s.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// The task itself — the only region that scrolls with content length
function StepContent() {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto px-6 py-8 pb-28 lg:px-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <p className="text-xs font-medium text-primary">Step 4 of 9</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Set up the circuit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Est. 8 minutes</p>
        </div>

        <div className="aspect-video w-full rounded-lg bg-muted" />

        <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground/90">
          <p>
            Connect the battery, switch, and bulb in a single closed loop
            using the wires provided. Make sure the switch is in the open
            (off) position before connecting the battery terminals.
          </p>
          <p>
            Double-check polarity: the wire from the battery's positive
            terminal should run to the switch, not directly to the bulb.
          </p>
        </div>

        <Card className="flex flex-col gap-3 p-5">
          <label className="text-sm font-medium">
            Before you close the switch, what do you predict will happen?
          </label>
          <Textarea
            placeholder="e.g. I predict the bulb will light up immediately once the switch is closed, because…"
            className="min-h-[96px]"
          />
        </Card>
      </div>
    </main>
  );
}

// Contextual help — separately scrollable, tabbed
function HelpRail() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[320px] shrink-0 flex-col border-l border-border/60 bg-card xl:flex">
      <div className="flex border-b border-border/60">
        <RailTab icon={Sparkles} label="AI Help" active />
        <RailTab icon={NotebookPen} label="Notes" />
        <RailTab icon={ListChecks} label="Materials" />
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Inkling</p>
          <p className="mt-1 leading-snug">
            Stuck on polarity? Look for the longer terminal on the battery —
            that's positive. Want a diagram?
          </p>
        </div>
        <Textarea
          placeholder="Ask a question about this step…"
          className="min-h-[72px] text-sm"
        />
        <Button size="sm" className="self-end">Ask</Button>
      </div>
    </aside>
  );
}

function RailTab({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Sparkles;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-medium ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// Fixed, always-reachable primary action — independent of scroll position
function BottomActionBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:left-[240px] lg:px-10 xl:right-[320px]">
      <Button variant="ghost" size="sm">
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>
      <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[44%] rounded-full bg-primary" />
        </div>
        <span>44%</span>
      </div>
      <Button size="sm">Save &amp; Continue</Button>
    </div>
  );
}
