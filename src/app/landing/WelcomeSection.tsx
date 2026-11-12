/** Welcome statement block. */
export function WelcomeSection() {
  return (
    <section className="px-8">
      <div className="mx-auto max-w-[1200px] py-16 lg:py-24">
        <p className="text-eyebrow uppercase text-teal-deep">Welcome</p>
        <h2 className="mt-4 max-w-2xl font-display text-[38px] font-medium leading-[1.15] tracking-tight text-ink lg:text-[40px]">
          Advances of science, made easier.
        </h2>
        <p className="mt-5 max-w-2xl text-[18px] leading-[1.7] text-ink-2 lg:text-[19px]">
          ScienceLab takes the admin out of teaching science. You focus on the
          experiment; we keep classes, work and progress in order.
        </p>
      </div>
    </section>
  );
}
