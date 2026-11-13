"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "../LogoutButton";
import { ThemeToggle } from "../ThemeToggle";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export type ShellRole = "STUDENT" | "TEACHER";

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-on-band-nav">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Account dropdown: change password, log out. Closes on outside click, Escape, or logout. */
function AccountMenu({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="menu"
      aria-label="Account"
      className="menu-pop absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-line bg-raised p-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
    >
      <Link
        href="/account/password"
        role="menuitem"
        onClick={onClose}
        className="flex h-10 items-center rounded-lg px-3 text-sm text-ink-2 transition-colors hover:bg-ink/[0.04] hover:text-ink"
      >
        Change password
      </Link>
      <div className="my-0.5 border-t border-line/60" role="separator" />
      <div onClick={onClose} role="none">
        <LogoutButton ghost />
      </div>
    </div>
  );
}

const NAV: Record<ShellRole, { href: string; label: string }[]> = {
  STUDENT: [
    { href: "/dashboard/student", label: "Dashboard" },
    { href: "/dashboard/student/classes", label: "My Classes" },
    { href: "/dashboard/student/experiments", label: "Experiments" },
  ],
  TEACHER: [
    { href: "/dashboard/teacher", label: "Dashboard" },
    { href: "/dashboard/teacher/classes", label: "Classes" },
    { href: "/dashboard/teacher/experiments", label: "Experiments" },
  ],
};

const NAV_ITEM =
  "rounded-lg px-3 py-1.5 text-[15px] font-medium transition-colors duration-150 no-underline";

/**
 * Dashboard chrome: solid teal top bar (wordmark, primary nav with a darker
 * active pill, account controls) per the all-screens PDF — the left sidebar
 * is gone. Bands keep the same teal in both themes (UI_DESIGN.md §0), so the
 * bar and its on-band text tokens are theme-invariant. Below md the nav
 * collapses into a hamburger panel.
 */
export function AppShell({ role, name, children }: { role: ShellRole; name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = NAV[role];

  // Account menu closes on outside click or Escape (navigation links close it explicitly).
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!(e.target as HTMLElement).closest?.("[data-account-menu]")) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function isActive(href: string) {
    if (pathname === href) return true;
    const isRoot = href === "/dashboard/student" || href === "/dashboard/teacher";
    return !isRoot && pathname.startsWith(href);
  }

  function closeMenus() {
    setOpen(false);
    setMenuOpen(false);
  }

  const home = role === "STUDENT" ? "/dashboard/student" : "/dashboard/teacher";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>

      <header className="band sticky top-0 z-30 bg-teal">
        <div className="flex h-16 items-center gap-x-4 px-4 sm:px-6 lg:gap-x-8">
          <Link
            href={home}
            onClick={closeMenus}
            className="shrink-0 font-display text-logo uppercase text-on-band no-underline"
          >
            ScienceLab
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeMenus}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`${NAV_ITEM} ${
                  isActive(l.href)
                    ? "bg-teal-deep text-on-band"
                    : "text-on-band-nav hover:text-on-band"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle tone="band" />
            <div className="relative" data-account-menu>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex cursor-pointer items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-left transition-colors hover:bg-teal-deep sm:gap-3"
              >
                <span className="hidden max-w-40 truncate text-[15px] font-medium text-on-band sm:block">
                  {name}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-band text-sm font-semibold text-teal"
                >
                  {initials(name)}
                </span>
                <ChevronDown />
              </button>
              {menuOpen ? <AccountMenu onClose={() => setMenuOpen(false)} /> : null}
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-band md:hidden"
            >
              {open ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {open ? (
          <nav aria-label="Mobile" className="border-t border-on-band/20 px-4 py-3 md:hidden">
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={closeMenus}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={`${NAV_ITEM} block ${
                      isActive(l.href)
                        ? "bg-teal-deep text-on-band"
                        : "text-on-band-nav hover:text-on-band"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col" id="dashboard-content">{children}</div>
    </div>
  );
}
