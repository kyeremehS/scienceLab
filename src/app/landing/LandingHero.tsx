import Link from "next/link";
import { LearningLoopDiagram } from "../LearningLoopDiagram";
import { ClassProgressMock } from "./ClassProgressMock";

/**
 * Hero on the main teal band. PDF layout (eyebrow, statement, subtext, two
 * actions, product panel) with UI_DESIGN.md §10 brand copy — the statement
 * and the two actions stay as §10 specifies.
 */
export function LandingHero() {
  return (
    <section className="band bg-teal px-8">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div className="flex flex-col items-start gap-6 text-left">
          <p className="text-eyebrow uppercase text-on-band-eyebrow">
            For teachers and students
          </p>
          <h1 className="font-display text-[40px] font-medium leading-[1.05] tracking-tight text-on-band sm:text-[62px]">
            Learn science by doing.
          </h1>
          <p className="max-w-xl text-[18px] leading-[1.65] text-on-band-muted lg:text-[19px]">
            Understand, prepare, perform, observe, reflect, and assess —
            practical experiments with structured digital guidance.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="rounded-btn bg-orange px-7 py-[15px] text-[16px] font-semibold text-white transition-colors duration-150 hover:bg-orange-hover"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-btn border border-on-band-eyebrow px-7 py-[15px] text-[16px] font-semibold text-on-band-soft transition-colors duration-150 hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
          <LearningLoopDiagram className="mt-2 w-full max-w-md text-on-band-muted" />
        </div>

        <ClassProgressMock className="lg:mt-4" />
      </div>
    </section>
  );
}
