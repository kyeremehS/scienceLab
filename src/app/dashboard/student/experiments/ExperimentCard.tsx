import Link from "next/link";
import { CircuitIllustration } from "@/app/auth/CircuitIllustration";

export interface ExperimentCardData {
  experimentId: string;
  title: string;
  description: string;
  difficulty: string;
  topic: string;
  durationMinutes: number;
  stepCount: number;
}

/** Brilliant-style experiment card: diagram visual, metadata, single CTA. */
export function ExperimentCard({ experiment }: { experiment: ExperimentCardData }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line bg-canvas px-4 pt-4">
        <CircuitIllustration className="w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 py-3">
        <p className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          {experiment.topic.toUpperCase()} · {experiment.difficulty.toUpperCase()}
        </p>
        <p className="text-base font-semibold">{experiment.title}</p>
        <p className="text-sm text-ink-2">
          {experiment.stepCount} steps · {experiment.durationMinutes} min
        </p>
        <p className="mt-2">
          <Link
            href={`/dashboard/student/experiments/${experiment.experimentId}`}
            className="text-sm font-medium text-accent-ink underline"
          >
            View experiment →
          </Link>
        </p>
      </div>
    </li>
  );
}
