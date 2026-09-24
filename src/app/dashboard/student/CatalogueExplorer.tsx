"use client";

import { useState } from "react";
import { ExperimentCard, type ExperimentCardData } from "./experiments/ExperimentCard";

/** Catalogue with honest client-side topic/level filters (no backend search in MVP). */
export function CatalogueExplorer({ experiments }: { experiments: ExperimentCardData[] }) {
  const topics = [...new Set(experiments.map((e) => e.topic))];
  const levels = [...new Set(experiments.map((e) => e.difficulty))];
  const filters = [...topics, ...levels];
  const [filter, setFilter] = useState<string | null>(null);
  const visible = filter
    ? experiments.filter((e) => e.topic === filter || e.difficulty === filter)
    : experiments;

  if (experiments.length === 0) {
    return <p className="mt-3 text-sm text-[#64748B]">No published experiments yet.</p>;
  }
  return (
    <div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter the catalogue">
        <button
          type="button"
          onClick={() => setFilter(null)}
          aria-pressed={filter === null}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            filter === null
              ? "border-[#0F172A] font-medium text-[#0F172A]"
              : "border-black/10 text-[#64748B]"
          }`}
        >
          All subjects
        </button>
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(filter === f ? null : f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === f
                ? "border-[#0F172A] font-medium text-[#0F172A]"
                : "border-black/10 text-[#64748B]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="mt-3 grid gap-6 sm:grid-cols-2">
        {visible.map((e) => (
          <ExperimentCard key={e.experimentId} experiment={e} />
        ))}
      </ul>
    </div>
  );
}
