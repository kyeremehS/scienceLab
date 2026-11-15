const SUBJECTS = ["Physics", "Chemistry", "Biology"];

/** Quiet subject strip between hero and welcome (spec p1). */
export function SubjectStrip() {
  return (
    <section aria-label="Subjects" className="border-b border-line bg-raised px-8">
      <ul className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-around gap-x-10 gap-y-2 py-6">
        {SUBJECTS.map((subject) => (
          <li
            key={subject}
            className="font-display text-[16px] font-bold uppercase tracking-[0.14em] text-ink"
          >
            {subject}
          </li>
        ))}
      </ul>
    </section>
  );
}
