import Link from "next/link";

/** Closing call to action on the orange band, above the footer (spec p3). */
export function FinalCta() {
  return (
    <section className="bg-orange px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 py-16 text-center lg:py-24">
        <h2 className="font-display text-[38px] font-medium leading-[1.15] tracking-tight text-white lg:text-[40px]">
          Ready to run your first class?
        </h2>
        <p className="max-w-xl text-[18px] leading-[1.7] text-white/90 lg:text-[19px]">
          Create a class, invite your students and assign work today.
        </p>
        <Link
          href="/register"
          className="mt-1 rounded-btn bg-white px-7 py-[15px] text-[16px] font-semibold text-orange transition-colors duration-150 hover:bg-white/90"
        >
          Get started
        </Link>
      </div>
    </section>
  );
}
