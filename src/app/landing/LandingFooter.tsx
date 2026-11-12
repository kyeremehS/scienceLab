import Link from "next/link";

/**
 * Landing footer on the deep teal band: three columns only.
 * Privacy/Terms are omitted — no such pages exist in the MVP and
 * UI_DESIGN.md §9 forbids dead links; contact placeholders are omitted
 * until real values exist.
 */
export function LandingFooter() {
  return (
    <footer className="band bg-teal-deep px-8">
      <div className="mx-auto max-w-[1200px] py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-display text-logo uppercase text-on-band">
              ScienceLab
            </p>
            <p className="mt-4 max-w-xs text-[16px] leading-[1.65] text-teal-pale">
              A calm workspace for teaching Physics, Chemistry and Biology.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-on-band-eyebrow">
              Product
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {[
                { href: "#features", label: "Features" },
                { href: "#how-it-works", label: "How it works" },
                { href: "#faq", label: "FAQ" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[16px] text-teal-pale no-underline transition-colors duration-150 hover:text-on-band"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-on-band-eyebrow">
              Account
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {[
                { href: "/login", label: "Sign in" },
                { href: "/register", label: "Create a class" },
                { href: "/register", label: "Join a class" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[16px] text-teal-pale no-underline transition-colors duration-150 hover:text-on-band"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-12 border-t border-band-divider pt-6 text-[15px] text-teal-pale">
          © 2026 ScienceLab. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
