"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export type ClassTab = "students" | "assignments" | "progress";

const TABS: { id: ClassTab; label: string }[] = [
  { id: "students", label: "Students" },
  { id: "assignments", label: "Assignments" },
  { id: "progress", label: "Progress" },
];

/**
 * Class sections. The selected tab lives in the URL (`?tab=`) so the
 * spec's New assignment action can deep-link straight to Assignments;
 * local clicks write the URL, external URL changes re-sync local state.
 */
export function ClassTabs({
  counts,
  initialTab = "students",
  students,
  assignments,
  progress,
}: {
  counts: Record<ClassTab, number | null>;
  initialTab?: ClassTab;
  students: React.ReactNode;
  assignments: React.ReactNode;
  progress: React.ReactNode;
}) {
  const [tab, setTab] = useState<ClassTab>(initialTab);
  // Re-sync when the URL changes under us (e.g. New assignment deep-links
  // ?tab=assignments): render-phase adjustment, not an effect.
  const [prevInitial, setPrevInitial] = useState(initialTab);
  if (prevInitial !== initialTab) {
    setPrevInitial(initialTab);
    setTab(initialTab);
  }
  const router = useRouter();
  const pathname = usePathname();
  const panels: Record<ClassTab, React.ReactNode> = { students, assignments, progress };

  function select(next: ClassTab) {
    setTab(next);
    // Membership and assignment data change from other sessions (students
    // joining, other tabs); the navigation re-runs the page's queries so
    // the panel never shows stale rows.
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <div>
      <div role="tablist" aria-label="Class sections" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => select(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors hover:text-ink ${
              tab === t.id
                ? "border-b-2 border-accent text-ink"
                : "text-ink-2"
            }`}
          >
            {t.label}
            {counts[t.id] !== null ? (
              <span className="ml-1.5 font-mono text-xs text-ink-3">{counts[t.id]}</span>
            ) : null}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-6">
        {panels[tab]}
      </div>
    </div>
  );
}
