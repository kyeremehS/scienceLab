const SUBJECTS = ["Physics", "Chemistry", "Biology"];

/** Quiet subject strip between hero and welcome. */
export function SubjectStrip() {
  return (
    <section aria-label="Subjects" className="border-b border-line px-8">
      <ul className="mx-auto flex max-w-[1200px] flex-wrap gap-x-10 gap-y-2 py-5">
        {SUBJECTS.map((subject) => (
          <li
            key={subject}
            className="text-[13px] font-semibold uppercase tracking-[0.16em] text-subjects-ink"
          >
            {subject}
          </li>
        ))}
      </ul>
    </section>
  );
}
