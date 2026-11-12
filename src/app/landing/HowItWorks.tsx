const STEPS = [
  { n: "1", title: "Create a class", body: "Start with Physics, Chemistry or Biology." },
  {
    n: "2",
    title: "Invite your students",
    body: "Share the class code and students join themselves.",
  },
  { n: "3", title: "Assign and track", body: "Hand out work and watch completion come in." },
];

/**
 * Three-step onboarding explainer. Step 1 carries the orange marker per the
 * PDF; steps 2 and 3 stay neutral so the sequence reads left to right.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-t border-line px-8">
      <div className="mx-auto max-w-[1200px] py-16 lg:py-24">
        <p className="text-eyebrow uppercase text-teal-deep">How it works</p>
        <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.15] tracking-tight text-ink lg:text-[40px]">
          Up and running in three steps
        </h2>
        <ol className="mt-10 grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-semibold text-white ${
                  step.n === "1" ? "bg-orange" : "bg-teal"
                }`}
              >
                {step.n}
              </span>
              <h3 className="mt-5 font-display text-[19px] font-medium text-ink lg:text-[20px]">
                {step.title}
              </h3>
              <p className="mt-3 text-[16px] leading-[1.65] text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
