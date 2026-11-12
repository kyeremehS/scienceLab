import type { ReactNode } from "react";

/**
 * Canonical content card: surface, 1px line border, rounded-lg.
 * `padded` off only when the card owns internal dividers/rows.
 */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface${padded ? " p-5" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

/** Card header pattern: eyebrow label + title + optional side slot. */
export function CardHeader({
  eyebrow,
  title,
  side,
}: {
  eyebrow?: string;
  title: string;
  side?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="font-mono text-xs text-ink-3">{eyebrow}</p>
        ) : null}
        <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {side}
    </div>
  );
}
