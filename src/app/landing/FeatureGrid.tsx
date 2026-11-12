const FEATURES = [
  {
    title: "Classes",
    body: "One class per subject, each with its own roster and class code.",
  },
  {
    title: "Assignments",
    body: "Create work once and assign it to one or many classes.",
  },
  {
    title: "Progress tracking",
    body: "See completion by class and by student without spreadsheets.",
  },
  {
    title: "Needs attention",
    body: "Students who haven't started are flagged so you can step in early.",
  },
  {
    title: "Easy joining",
    body: "Students join with a code. No manual data entry for you.",
  },
  {
    title: "Safe and private",
    body: "Student work is visible only to their teacher and to them.",
  },
];

/**
 * Feature band on the main teal: white cards on teal, auto-fit grid with a
 * 280px minimum and 28px gap. One containment rule — cards only.
 */
export function FeatureGrid() {
  return (
    <section id="features" className="band scroll-mt-24 bg-teal px-8">
      <div className="mx-auto max-w-[1200px] py-16 lg:py-24">
        <p className="text-eyebrow uppercase text-on-band-eyebrow">Features</p>
        <h2 className="mt-4 font-display text-[38px] font-medium leading-[1.15] tracking-tight text-on-band lg:text-[40px]">
          Everything a science class needs
        </h2>
        <ul className="mt-10 grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="rounded-card bg-surface p-8 shadow-card"
            >
              <h3 className="font-display text-[19px] font-medium text-ink lg:text-[20px]">
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
