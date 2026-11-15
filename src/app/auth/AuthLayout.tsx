import Link from "next/link";
import { ThemeToggle } from "../ThemeToggle";

/**
 * Split-screen auth shell per spec p4 (and docs/UI_DESIGN.md §2).
 * Left: solid teal band with wordmark, "Serving science, one class at a time.",
 * supporting copy, and copyright footer.
 * Right: vertically centered form column on the canvas.
 */
export function AuthLayout({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      {/* Teal brand panel (spec p4): identical teal in both themes. */}
      <div className="band flex flex-col justify-between bg-teal px-8 py-8 text-on-band min-[480px]:py-10 lg:w-1/2 lg:px-14 lg:py-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-logo uppercase text-on-band no-underline"
          >
            ScienceLab
          </Link>
          <div className="lg:hidden">
            <ThemeToggle tone="band" />
          </div>
        </div>

        <div className="my-8 max-w-lg lg:my-0">
          <p className="font-display text-3xl font-medium leading-[1.1] tracking-tight text-on-band sm:text-[44px]">
            Serving science, one class at a time.
          </p>
          <p className="mt-4 max-w-md text-[17px] leading-[1.6] text-on-band-soft">
            Classes, assignments and progress for Physics, Chemistry and
            Biology.
          </p>
        </div>

        <p className="text-sm text-on-band-muted">© 2026 ScienceLab</p>
      </div>

      {/* Form side: canvas background, centered form column. */}
      <main className="relative flex flex-1 items-start justify-center px-6 py-10 lg:items-center lg:py-12">
        <div className="absolute right-4 top-4 hidden lg:right-8 lg:top-6 lg:block">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[420px]">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1.5 text-sm text-ink-2">{subheading}</p>
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
