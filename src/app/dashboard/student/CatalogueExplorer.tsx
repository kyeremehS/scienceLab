"use client";

import { useState } from "react";
import { ExperimentCard, type ExperimentCardData } from "./experiments/ExperimentCard";

/** Catalogue with honest client-side topic filters (no backend search in MVP). */
export function CatalogueExplorer({
  experiments,
  assignedExperimentIds,
}: {
  experiments: ExperimentCardData[];
  assignedExperimentIds?: Set<string>;
}) {
  const topics = [...new Set(experiments.map((e) => e.topic))];
  const [topic, setTopic] = useState<string | null>(null);
  const visible = topic ? experiments.filter((e) => e.topic === topic) : experiments;

  if (experiments.length === 0) {
    return <p className="mt-3 text-sm text-ink-2">No published experiments yet.</p>;
  }
  return (
    <div>
      {topics.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          <button
            type="button"
            onClick={() => setTopic(null)}
            aria-pressed={topic === null}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              topic === null
                ? "border-accent bg-accent/[0.08] font-medium text-accent-ink"
                : "border-line text-ink-2 hover:bg-raised"
            }`}
          >
            All topics
          </button>
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(topic === t ? null : t)}
              aria-pressed={topic === t}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                topic === t
                  ? "border-accent bg-accent/[0.08] font-medium text-accent-ink"
                  : "border-line text-ink-2 hover:bg-raised"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((e, i) => (
          <ExperimentCard
            key={e.experimentId}
            experiment={e}
            featured={i === 0 && visible.length > 1}
            assigned={assignedExperimentIds?.has(e.experimentId) ?? false}
          />
        ))}
      </ul>
    </div>
  );
}
