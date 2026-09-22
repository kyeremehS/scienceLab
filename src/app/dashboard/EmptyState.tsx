/**
 * Designed empty state: subtle motif, plain-language state, what unlocks it,
 * and the action inline. Never blank text.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-8 text-center">
      <svg
        viewBox="0 0 64 40"
        aria-hidden="true"
        focusable="false"
        className="mx-auto w-16 text-ink-3"
        role="presentation"
      >
        <rect x="2" y="2" width="60" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <circle cx="20" cy="20" r="4" fill="none" stroke="var(--circuit-accent)" strokeWidth="1.5" />
        <circle cx="44" cy="20" r="4" fill="none" stroke="var(--circuit-accent)" strokeWidth="1.5" />
        <line x1="24" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="8" y1="32" x2="24" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="40" y1="8" x2="56" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
