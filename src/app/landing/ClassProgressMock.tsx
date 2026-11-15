/**
 * Hero panel (spec p1): a labels-only preview of the class progress panel,
 * sitting on the teal band as the hero card (16px radius, hero shadow).
 * Structure and labels only — no statuses, counts, or completion numbers,
 * so it never reads as data without a backing query (UI_DESIGN.md §9).
 */
export function ClassProgressMock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-panel bg-surface p-8 shadow-hero ${className}`}
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
        <span className="font-display text-[20px] font-medium text-ink">
          Class progress
        </span>
        <span className="text-[15px] font-semibold text-accent-ink">
          Manage classes
        </span>
      </div>

      <ul className="divide-y divide-line">
        {["Physics", "Chemistry", "Biology"].map((subject) => (
          <li key={subject} className="flex items-center justify-between py-4">
            <span className="text-[16px] font-medium text-ink">{subject}</span>
            <span className="text-[14px] text-ink-3">Open</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-card bg-orange-tint px-4 py-3">
        <p className="text-[14px] leading-[1.6] text-orange-tint-ink">
          <span className="font-semibold">Needs attention:</span> students who
          haven&apos;t started appear here.
        </p>
      </div>
    </div>
  );
}
