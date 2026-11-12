import Link from "next/link";
import { ThemeToggle } from "../ThemeToggle";

const SECTIONS = [
  { href: "#features", label: "Features" },
  { href: "#for-teachers", label: "For teachers" },
  { href: "#for-students", label: "For students" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Landing header on the main teal band: wordmark, section anchors,
 * account actions. Anchors are same-page links (never dead links,
 * UI_DESIGN.md §9); the theme toggle is required on the landing page (§8.2).
 */
export function LandingHeader() {
  return (
    <header className="band sticky top-0 z-10 bg-teal">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-8 py-4">
        <Link
          href="/"
          className="font-display text-logo uppercase text-on-band no-underline"
        >
          ScienceLab
        </Link>

        <nav aria-label="Sections" className="hidden lg:flex items-center gap-7">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="text-[15px] font-medium text-on-band-nav no-underline transition-colors duration-150 hover:text-on-band"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/login"
            className="text-[15px] font-medium text-on-band-soft no-underline transition-colors duration-150 hover:text-on-band"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-btn bg-orange px-7 py-[15px] text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-orange-hover"
          >
            Get started
          </Link>
          <ThemeToggle tone="band" />
        </div>
      </div>
    </header>
  );
}
