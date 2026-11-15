import Link from "next/link";
import { ClassProgressMock } from "./ClassProgressMock";

/**
 * Hero on the main teal band (spec p1): eyebrow, statement, subtext, two
 * actions (Create your first class / See how it works), and the Class
 * progress preview panel.
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
            Serving science, one class at a time.
          </h1>
          <p className="max-w-xl text-[18px] leading-[1.65] text-on-band-muted lg:text-[19px]">
            Set up your classes, hand out assignments and see who has started,
            all in one calm workspace for Physics, Chemistry and Biology.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="rounded-btn bg-orange px-7 py-[15px] text-[16px] font-semibold text-white transition-colors duration-150 hover:bg-orange-hover"
            >
              Create your first class
            </Link>
            <a
              href="#how-it-works"
              className="rounded-btn border border-on-band-eyebrow px-7 py-[15px] text-[16px] font-semibold text-on-band-soft no-underline transition-colors duration-150 hover:bg-white/10"
            >
              See how it works
            </a>
          </div>
        </div>

        <ClassProgressMock className="lg:mt-4" />
      </div>
    </section>
  );
}
