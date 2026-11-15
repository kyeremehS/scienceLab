const QUESTIONS = [
  {
    q: "How do students join a class?",
    a: "Each class has a code. Students sign in, enter the code and appear in your roster straight away.",
  },
  {
    q: "Which subjects are supported?",
    a: "Physics, Chemistry and Biology are ready today. Each has its own class and its own progress view.",
  },
  {
    q: "Can I see how my class is doing?",
    a: "Yes. The dashboard shows assignments that are active, completion by class, and any student who hasn't started.",
  },
  {
    q: "Who can see student work?",
    a: "Only the student and their teacher. We never show one class's work to another.",
  },
];

/**
 * FAQ accordion built on native <details>/<summary> (spec pp.2–3): centered
 * heading, white surface cards with a disclosure triangle.
 * The pricing question is omitted — no pricing exists in the MVP docs.
 */
export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-8">
      <div className="mx-auto max-w-[760px] py-16 lg:py-24">
        <div className="text-center">
          <p className="text-eyebrow uppercase text-orange dark:text-copper">FAQ</p>
          <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.15] tracking-tight text-ink lg:text-[40px]">
            Questions, answered
          </h2>
        </div>
        <div className="mt-10 flex flex-col gap-3.5">
          {QUESTIONS.map((item) => (
            <details
              key={item.q}
              className="group rounded-card bg-surface px-6 py-4 shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 text-[16px] font-semibold text-ink">
                <span
                  aria-hidden="true"
                  className="text-xs text-ink transition-transform duration-150 group-open:rotate-90"
                >
                  ▸
                </span>
                <span>{item.q}</span>
              </summary>
              <p className="mt-3 pl-5 text-[15px] leading-[1.7] text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
