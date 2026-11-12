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
 * FAQ accordion built on native <details>/<summary>: keyboard operable
 * and announced correctly without any client JavaScript.
 * The pricing question is omitted — no pricing exists in the MVP docs.
 */
export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-line px-8">
      <div className="mx-auto max-w-[1200px] py-16 lg:py-24">
        <p className="text-eyebrow uppercase text-teal-deep">FAQ</p>
        <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.15] tracking-tight text-ink lg:text-[40px]">
          Questions, answered
        </h2>
        <div className="mt-10 max-w-3xl">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group border-b border-line py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-ink">
                {item.q}
                <span
                  aria-hidden="true"
                  className="text-teal-deep transition-transform duration-150 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[16px] leading-[1.7] text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
