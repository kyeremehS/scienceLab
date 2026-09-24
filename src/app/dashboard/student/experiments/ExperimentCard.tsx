import Link from "next/link";

export interface ExperimentCardData {
  experimentId: string;
  title: string;
  description: string;
  difficulty: string;
  topic: string;
  durationMinutes: number;
  stepCount: number;
}

/** Catalogue card: outline badges, title, duration + details link. */
export function ExperimentCard({ experiment }: { experiment: ExperimentCardData }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-[#0F172A]">
          {experiment.topic}
        </span>
        <span className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-[#0F172A]">
          {experiment.difficulty}
        </span>
      </div>
      <p className="text-[15px] font-semibold leading-snug text-[#0F172A]">{experiment.title}</p>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-sm text-[#64748B]">~{experiment.durationMinutes} min</span>
        <Link
          href={`/dashboard/student/experiments/${experiment.experimentId}`}
          className="text-sm font-medium text-[#0F172A]"
        >
          View details
        </Link>
      </div>
    </li>
  );
}
