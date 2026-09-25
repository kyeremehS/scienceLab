import Link from "next/link";
import { ExperimentVisual } from "./ExperimentVisual";

export interface ExperimentCardData {
  experimentId: string;
  title: string;
  description: string;
  difficulty: string;
  topic: string;
  durationMinutes: number;
  stepCount: number;
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/**
 * Catalogue card: per-topic motif, topic and level in separate slots,
 * display title, duration/steps meta, chevron CTA.
 */
export function ExperimentCard({
  experiment,
  featured,
  assigned,
}: {
  experiment: ExperimentCardData;
  featured?: boolean;
  assigned?: boolean;
}) {
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface ${
        featured ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex h-44 shrink-0 items-center justify-center border-b border-line bg-canvas px-4">
        <ExperimentVisual topic={experiment.topic} className="h-full w-auto max-w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line px-2 py-0.5 text-xs font-medium text-ink-2">
            {experiment.topic}
          </span>
          <span className="rounded-md border border-line px-2 py-0.5 text-xs font-medium text-ink-2">
            {experiment.difficulty}
          </span>
          {assigned ? (
            <span className="rounded-md bg-accent/[0.08] px-2 py-0.5 text-xs font-medium text-accent-ink">
              Assigned
            </span>
          ) : null}
        </div>
        <p className="min-h-[3.25rem] font-display text-lg font-semibold leading-snug tracking-tight">{experiment.title}</p>
        <div className="flex items-center gap-4 text-sm text-ink-2">
          <span>{experiment.stepCount} steps</span>
          <span>{experiment.durationMinutes} min</span>
        </div>
        <p className="mt-2">
          <Link
            href={`/dashboard/student/experiments/${experiment.experimentId}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink"
          >
            View experiment
            <Chevron />
          </Link>
        </p>
      </div>
    </li>
  );
}
