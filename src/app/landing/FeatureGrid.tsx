import type { ReactNode } from "react";

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Classes",
    body: "One class per subject, each with its own roster and class code.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5 12 4l9 6.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    title: "Assignments",
    body: "Create work once and assign it to one or many classes.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 3h6" />
        <path d="M10 3v6.5L5 19a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 19l-5-9.5V3" />
      </svg>
    ),
  },
  {
    title: "Progress tracking",
    body: "See completion by class and by student without spreadsheets.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20h16" />
        <path d="M8 20v-6" />
        <path d="M12 20V8" />
        <path d="M16 20v-9" />
      </svg>
    ),
  },
  {
    title: "Needs attention",
    body: "Students who haven't started are flagged so you can step in early.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </svg>
    ),
  },
  {
    title: "Easy joining",
    body: "Students join with a code. No manual data entry for you.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19a6 6 0 0 1 12 0" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 19a5 5 0 0 1 5 0" />
      </svg>
    ),
  },
  {
    title: "Safe and private",
    body: "Student work is visible only to their teacher and to them.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z" />
      </svg>
    ),
  },
];

/**
 * Feature band on the main teal (spec pp.1–2): centered heading, 6 white cards
 * on teal in a 3x2 grid, each with a pale-teal circular icon badge.
 */
export function FeatureGrid() {
  return (
    <section id="features" className="band scroll-mt-24 bg-teal px-8">
      <div className="mx-auto max-w-[1200px] py-16 lg:py-24">
        <div className="text-center">
          <p className="text-eyebrow uppercase text-on-band-eyebrow">Features</p>
          <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.15] tracking-tight text-on-band lg:text-[40px]">
            Everything a science class needs
          </h2>
        </div>
        <ul className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="rounded-card bg-surface p-8 shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-pale text-teal-ink dark:bg-teal/20 dark:text-teal-pale">
                {feature.icon}
              </span>
              <h3 className="mt-5 font-display text-[19px] font-medium text-ink lg:text-[20px]">
                {feature.title}
              </h3>
              <p className="mt-3 text-[16px] leading-[1.65] text-ink-2">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
