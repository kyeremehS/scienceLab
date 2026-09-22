/**
 * Decorative learning-loop diagram (Learn → Perform → Observe → Reflect →
 * Assess). Distinct from the auth circuit; reflects the product loop.
 * Aria-hidden; surrounding copy carries meaning.
 */
export function LearningLoopDiagram({ className = "" }: { className?: string }) {
  const steps = ["Learn", "Perform", "Observe", "Reflect", "Assess"];
  const cx = [40, 130, 220, 310, 400];
  const cy = 30;
  return (
    <svg
      viewBox="0 0 440 90"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      role="presentation"
    >
      {/* Connector */}
      <line
        x1={cx[0]}
        y1={cy}
        x2={cx[cx.length - 1]}
        y2={cy}
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
      {steps.map((step, i) => (
        <g key={step}>
          <circle
            cx={cx[i]}
            cy={cy}
            r="7"
            style={{ stroke: "var(--circuit-accent)" }}
            strokeWidth="2"
          />
          <circle cx={cx[i]} cy={cy} r="2.5" style={{ fill: "var(--circuit-accent)" }} />
          <text
            x={cx[i]}
            y={cy + 28}
            textAnchor="middle"
            fill="currentColor"
            fontSize="11"
            opacity="0.85"
          >
            {step}
          </text>
        </g>
      ))}
      {/* Return arc: Assess → Learn */}
      <path
        d="M 400 52 C 400 74, 40 74, 40 52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.55"
      />
    </svg>
  );
}
