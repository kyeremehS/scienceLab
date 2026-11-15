import Link from "next/link";

type AudienceProps = {
  id: string;
  eyebrow: string;
  heading: string;
  bullets: string[];
  ctaLabel: string;
  tone?: "orange" | "teal";
};

/** Audience card (spec p2: For teachers / For students side by side). */
export function AudienceSection({
  id,
  eyebrow,
  heading,
  bullets,
  ctaLabel,
  tone = "orange",
}: AudienceProps) {
  const isTeal = tone === "teal";
  return (
    <section
      id={id}
      className="scroll-mt-24 flex flex-col justify-between rounded-card bg-surface p-8 shadow-card sm:p-10"
    >
      <div>
        <p
          className={`text-eyebrow uppercase ${
            isTeal ? "text-teal-deep dark:text-teal-light" : "text-orange dark:text-copper"
          }`}
        >
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-[28px] font-medium leading-[1.2] tracking-tight text-ink lg:text-[32px]">
          {heading}
        </h2>
        <ul className="mt-6 flex flex-col gap-3.5">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-baseline gap-3 text-[16px] leading-[1.6] text-ink-2">
              <span aria-hidden="true" className="shrink-0 font-semibold text-teal dark:text-teal-light">
                ✓
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8">
        <Link
          href="/register"
          className={`inline-block rounded-btn px-7 py-[15px] text-[16px] font-semibold text-white transition-colors duration-150 ${
            isTeal ? "bg-teal hover:bg-teal-deep" : "bg-orange hover:bg-orange-hover"
          }`}
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
