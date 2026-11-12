import Link from "next/link";

type AudienceProps = {
  id: string;
  eyebrow: string;
  heading: string;
  bullets: string[];
  ctaLabel: string;
};

/** Shared two-column audience block (For teachers / For students). */
export function AudienceSection({ id, eyebrow, heading, bullets, ctaLabel }: AudienceProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line px-8">
      <div className="mx-auto grid max-w-[1200px] gap-10 py-16 lg:grid-cols-2 lg:items-start lg:py-24">
        <div>
          <p className="text-eyebrow uppercase text-teal-deep">{eyebrow}</p>
          <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.15] tracking-tight text-ink lg:text-[40px]">
            {heading}
          </h2>
        </div>
        <div>
          <ul className="flex flex-col gap-4">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-4 text-[17px] leading-[1.6] text-ink-2">
                <span aria-hidden="true" className="mt-3 h-px w-5 shrink-0 bg-line" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-btn bg-orange px-7 py-[15px] text-[16px] font-semibold text-white transition-colors duration-150 hover:bg-orange-hover"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
