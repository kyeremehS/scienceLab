/**
 * Per-topic experiment visuals: schematic graphite linework with a copper
 * highlight, never the interactive teal — diagrams must not read as clickable.
 * Motif follows the experiment topic; unknown topics fall back to the circuit.
 */
export function ExperimentVisual({
  topic,
  className = "",
}: {
  topic: string;
  className?: string;
}) {
  const t = topic.toLowerCase();
  const motif = t.includes("chem")
    ? "flask"
    : t.includes("bio") || t.includes("plant") || t.includes("life")
      ? "leaf"
      : "circuit";
  return (
    <svg
      viewBox="0 0 200 120"
      role="img"
      aria-label={`${motif} diagram`}
      className={className}
      fill="none"
      stroke="var(--diagram-line)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {motif === "flask" ? (
        <>
          <path d="M85 15h30" />
          <path d="M90 15v25L65 85a8 8 0 0 0 7 12h56a8 8 0 0 0 7-12L110 40V15" />
          <path d="M72 78h56" stroke="var(--diagram-glow)" />
          <circle cx="95" cy="88" r="1.5" fill="var(--diagram-glow)" stroke="none" />
          <circle cx="105" cy="90" r="1.5" fill="var(--diagram-glow)" stroke="none" />
          <circle cx="100" cy="82" r="1" fill="var(--diagram-glow)" stroke="none" />
        </>
      ) : motif === "leaf" ? (
        <>
          <path d="M100 105C60 90 45 55 55 20c35-5 70 10 85 45 8 18 2 30-8 38" />
          <path d="M100 105C95 75 85 50 60 32" />
          <path d="M85 70l-12-4M92 55l-12-6M100 88l14-2" />
          <circle cx="140" cy="103" r="3" stroke="var(--diagram-glow)" />
          <path d="M140 100v-8M136 96l8-4" stroke="var(--diagram-glow)" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <rect x="30" y="30" width="140" height="60" rx="2" />
          <path d="M70 30l6-8 6 8 6-8 6 8 6-8 6 8" stroke="var(--diagram-line)" />
          <path d="M120 90v-14M126 90v-14" />
          <path d="M120 76v-6M126 76v-6" stroke="var(--diagram-glow)" />
          <circle cx="150" cy="90" r="4" stroke="var(--diagram-glow)" />
          <circle cx="150" cy="90" r="1.5" fill="var(--diagram-glow)" stroke="none" />
        </>
      )}
    </svg>
  );
}
