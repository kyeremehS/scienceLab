/**
 * Hero panel: a labels-only preview of the class progress panel, sitting on
 * the teal band as the hero card (16px radius, hero shadow).
 * Structure and labels only — no statuses, counts, or completion numbers,
 * so it never reads as data without a backing query (UI_DESIGN.md §9).
 * Decorative; the surrounding copy carries the meaning.
 */
export function ClassProgressMock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-panel bg-surface p-8 shadow-hero ${className}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-[20px] font-medium text-ink">
          Class progress
        </span>
        <span className="text-[15px] font-semibold text-accent-ink">
          Manage classes
        </span>
      </div>

      <ul className="mt-5 divide-y divide-line">
        {["Physics", "Chemistry", "Biology"].map((subject) => (
          <li key={subject} className="flex items-center justify-between py-4">
            <span className="text-[16px] text-ink">{subject}</span>
            <span className="h-1.5 w-20 rounded-full bg-raised" />
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-card bg-orange-tint p-4">
        <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-orange-tint-ink">
          Needs attention
        </span>
        <p className="mt-1.5 text-[15px] leading-[1.6] text-orange-tint-ink">
          Students who haven&apos;t started appear here.
        </p>
      </div>
    </div>
  );
}
