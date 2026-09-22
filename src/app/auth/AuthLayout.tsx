import { CircuitIllustration } from "./CircuitIllustration";
import { ThemeToggle } from "../ThemeToggle";

/**
 * Split-screen auth shell per docs/UI_DESIGN.md §2.
 * Left: one composed, vertically centered brand block.
 * Right: vertically centered form column (max 480px).
 * Mobile: stacked brand block (with circuit) above the form.
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
      {/* Brand panel: full-bleed surface on mobile, no framed container. */}
      <div className="flex flex-col justify-center bg-surface px-8 py-8 text-ink min-[480px]:py-10 lg:w-[45%] lg:items-end lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold tracking-[0.2em]">SCIENCELAB</p>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
          <p className="mt-4 text-xl font-semibold tracking-tight lg:text-3xl">
            Learn science by doing.
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink-2">
            Explore practical experiments, record observations, and build
            understanding through hands-on learning.
          </p>
          <CircuitIllustration className="mt-6 w-full max-w-[280px] text-ink min-[480px]:max-w-sm lg:max-w-md" />
        </div>
      </div>

      {/* Form side: top-aligned on mobile so no gap opens under the brand
          block; vertically centered on desktop, pulled toward the divider. */}
      <main className="relative flex flex-1 items-start justify-center px-6 py-8 lg:items-center lg:justify-start lg:py-12 lg:pl-12 xl:pl-20">
        <div className="absolute right-4 top-4 hidden lg:right-8 lg:top-6 lg:block">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[480px]">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-ink-2">{subheading}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
