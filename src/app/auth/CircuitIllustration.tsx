/**
 * Decorative line-art of the MVP's first experiment: a simple electrical
 * circuit (battery → resistor → LED). Aria-hidden; brand copy carries meaning.
 * Grays follow the surrounding text color; the accent follows --circuit-accent
 * so the diagram stays legible in both themes.
 */
export function CircuitIllustration({ className = "" }: { className?: string }) {
  const accent = { stroke: "var(--circuit-accent)" } as const;
  return (
    <svg
      viewBox="0 0 400 260"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      role="presentation"
    >
      <defs>
        <pattern id="sciencelab-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="400" height="260" fill="url(#sciencelab-grid)" rx="8" />

      {/* Wire loop */}
      <path
        d="M 60 200 L 60 60 L 340 60 L 340 200 L 250 200 M 150 200 L 60 200"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.55"
      />

      {/* Battery (left-bottom break) */}
      <line x1="150" y1="176" x2="150" y2="224" style={accent} strokeWidth="2" />
      <line x1="170" y1="188" x2="170" y2="212" style={accent} strokeWidth="6" />
      <line x1="150" y1="200" x2="170" y2="200" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      <text x="132" y="244" fill="currentColor" fontSize="11" opacity="0.6">Battery</text>

      {/* Resistor zigzag (top wire) */}
      <path
        d="M 120 60 L 150 60 L 160 44 L 180 76 L 200 44 L 220 76 L 240 44 L 250 60 L 280 60"
        style={accent}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="178" y="34" fill="currentColor" fontSize="11" opacity="0.6">Resistor</text>

      {/* LED (right-bottom break): diode triangle + bar + rays */}
      <path d="M 250 200 L 250 176 L 274 188 L 250 200 Z" style={accent} strokeWidth="2" strokeLinejoin="round" />
      <line x1="274" y1="176" x2="274" y2="200" style={accent} strokeWidth="2" />
      <line x1="282" y1="172" x2="292" y2="162" style={accent} strokeWidth="1.5" />
      <line x1="288" y1="182" x2="298" y2="172" style={accent} strokeWidth="1.5" />
      <text x="252" y="244" fill="currentColor" fontSize="11" opacity="0.6">LED</text>

      {/* Current dots */}
      <circle cx="100" cy="60" r="3" style={{ fill: "var(--circuit-accent)" }} />
      <circle cx="300" cy="60" r="3" style={{ fill: "var(--circuit-accent)" }} />
      <circle cx="340" cy="130" r="3" style={{ fill: "var(--circuit-accent)" }} />
    </svg>
  );
}
