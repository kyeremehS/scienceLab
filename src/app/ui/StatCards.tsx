/** Four-up summary tiles (spec p5): big value, quiet label underneath. */
export function StatCards({ stats }: { stats: { value: string; label: string }[] }) {
  const columns =
    stats.length <= 2 ? "grid-cols-2" : stats.length === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid gap-4 ${columns}`} role="group" aria-label="Summary">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-line bg-surface p-5">
          <p className="font-display text-3xl font-semibold tracking-tight">{s.value}</p>
          <p className="mt-1 text-sm text-ink-2">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
