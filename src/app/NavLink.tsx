import Link from "next/link";

/**
 * Site-wide back/nav link: teal, no underline, arrow separated by a 6px gap.
 * Use for every back/nav-style link on every page (never raw accent + underline).
 */
export function NavLink({
  href,
  arrow,
  className,
  children,
}: {
  href: string;
  arrow?: "back" | "forward";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-[6px] text-[13px] font-medium text-[#5dcaa5] no-underline transition-colors duration-150 hover:text-[#9fe1cb]${className ? ` ${className}` : ""}`}
    >
      {arrow === "back" ? <span aria-hidden="true">←</span> : null}
      <span>{children}</span>
      {arrow === "forward" ? <span aria-hidden="true">→</span> : null}
    </Link>
  );
}
