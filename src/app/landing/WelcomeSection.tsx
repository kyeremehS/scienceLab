import Image from "next/image";

/** Welcome statement block (spec p1) with the science photo. */
export function WelcomeSection() {
  return (
    <section className="px-8">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 py-16 lg:grid-cols-2 lg:gap-14 lg:py-24">
        <div className="text-center lg:text-left">
          <p className="text-eyebrow uppercase text-orange dark:text-copper">Welcome</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-[38px] font-medium leading-[1.15] tracking-tight text-ink lg:mx-0 lg:text-[40px]">
            Advances of science, made easier.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[18px] leading-[1.7] text-ink-2 lg:mx-0 lg:text-[19px]">
            ScienceLab takes the admin out of teaching science. You focus on the
            experiment; we keep classes, work and progress in order.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-card border border-line shadow-card">
          <Image
            src="/science picture.jpg"
            alt="Students running a chemistry experiment together at the board"
            width={1200}
            height={800}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-64 w-full object-cover sm:h-80"
          />
        </div>
      </div>
    </section>
  );
}
