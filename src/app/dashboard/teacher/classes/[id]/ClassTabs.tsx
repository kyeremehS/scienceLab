"use client";

import { useState } from "react";

export type ClassTab = "overview" | "students" | "assignments";

const TABS: { id: ClassTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "students", label: "Students" },
  { id: "assignments", label: "Assignments" },
];

export function ClassTabs({
  counts,
  overview,
  students,
  assignments,
}: {
  counts: Record<ClassTab, number | null>;
  overview: React.ReactNode;
  students: React.ReactNode;
  assignments: React.ReactNode;
}) {
  const [tab, setTab] = useState<ClassTab>("overview");
  const panels: Record<ClassTab, React.ReactNode> = { overview, students, assignments };

  return (
    <div>
      <div role="tablist" aria-label="Class sections" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
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
