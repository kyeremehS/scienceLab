export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "error" | "pending" | "done";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-raised text-ink-2",
  accent: "bg-accent/[0.08] text-accent-ink",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  /* Status pills from the spec (pp.6–7): warm tint = Not started, pale
     teal = Done. Dark mode inverts Done the way --orange-tint inverts. */
  pending: "bg-orange-tint text-orange-tint-ink",
  done: "bg-teal-pale text-teal-ink dark:bg-teal/20 dark:text-teal-pale",
};

/** Status pill: tinted fill + text, never a bare color dot. */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </span>
  );
}

/** Mono metadata tag: codes, counts, eyebrows. */
export function Meta({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs text-ink-3">{children}</span>;
}
