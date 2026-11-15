const STEPS = [
  {
    n: "1",
    title: "Create a class",
    body: "Start with Physics, Chemistry or Biology.",
    badgeClass: "bg-orange text-white",
  },
  {
    n: "2",
    title: "Invite your students",
    body: "Share the class code and students join themselves.",
    badgeClass: "bg-teal text-white",
  },
  {
    n: "3",
    title: "Assign and track",
    body: "Hand out work and watch completion come in.",
    badgeClass: "bg-ink text-surface",
  },
];

/**
 * Three-step onboarding explainer (spec p2): vertical sequence with orange,
 * teal, and ink step badges.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-surface px-8">
      <div className="mx-auto max-w-[900px] py-16 lg:py-24">
        <p className="text-eyebrow uppercase text-orange dark:text-copper">How it works</p>
        <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.15] tracking-tight text-ink lg:text-[40px]">
          Up and running in three steps
        </h2>
        <ol className="mt-10 flex flex-col gap-7">
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-5">
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold ${step.badgeClass}`}
              >
                {step.n}
              </span>
              <div>
                <h3 className="font-display text-[19px] font-medium text-ink lg:text-[20px]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[16px] leading-[1.65] text-ink-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
