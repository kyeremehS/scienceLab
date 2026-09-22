import Link from "next/link";

/**
 * State-driven hero: date eyebrow, title, subline, one primary CTA.
 * Typographic on purpose — diagrams live on cards and in the workspace,
 * not duplicated here.
 */
export function Hero({
  eyebrow,
  title,
  subtitle,
  cta,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
}) {
  return (
    <section
      aria-label="Welcome"
      className="rounded-xl border border-line bg-surface px-6 py-8 sm:px-8"
    >
      <div className="max-w-md">
        <p className="font-mono text-xs text-ink-3">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-2">{subtitle}</p>
        {cta ? (
          <p className="mt-4">
            <Link
              href={cta.href}
              className="inline-block rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              {cta.label}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function StatCards({ stats }: { stats: { value: string; label: string }[] }) {
  const columns =
    stats.length <= 2 ? "grid-cols-2" : stats.length === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid gap-3 ${columns}`} role="group" aria-label="Summary">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-4">
          <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
          <p className="mt-1 text-xs text-ink-2">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
