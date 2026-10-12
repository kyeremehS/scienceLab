type BadgeTone = "neutral" | "accent" | "success" | "warning" | "error";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-raised text-ink-2",
  accent: "bg-accent/[0.08] text-accent-ink",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
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
