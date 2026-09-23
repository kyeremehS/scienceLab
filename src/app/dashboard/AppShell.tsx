"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3h6" />
      <path d="M10 3v5.5L4.8 17a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L14 8.5V3" />
      <line x1="7.5" y1="15" x2="16.5" y2="15" />
    </svg>
  );
}

function ClassesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
    </svg>
  );
}

const NAV: Record<ShellRole, { href: string; label: string; icon: () => React.ReactNode }[]> = {
  STUDENT: [
    { href: "/dashboard/student", label: "Dashboard", icon: DashboardIcon },
    { href: "/dashboard/student/experiments", label: "Experiments", icon: FlaskIcon },
  ],
  TEACHER: [
    { href: "/dashboard/teacher", label: "Dashboard", icon: DashboardIcon },
    { href: "/dashboard/teacher/classes", label: "Classes", icon: ClassesIcon },
  ],
};

export function AppShell({ role, name, children }: { role: ShellRole; name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = NAV[role];

  function isActive(href: string) {
    if (pathname === href) return true;
    const isRoot = href === "/dashboard/student" || href === "/dashboard/teacher";
    return !isRoot && pathname.startsWith(href);
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const roleLabel = role === "STUDENT" ? "Student" : "Teacher";

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-surface px-4 py-6 md:flex">
        <p className="whitespace-nowrap px-3 text-sm font-semibold tracking-[0.18em]">SCIENCELAB</p>
        <nav aria-label="Primary" className="mt-8 flex-1">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(l.href)
                      ? "bg-accent/[0.08] text-ink"
                      : "text-ink-2 hover:bg-raised hover:text-ink"
                  }`}
                >
                  <span aria-hidden="true" className={isActive(l.href) ? "text-accent-ink" : ""}>
                    <l.icon />
                  </span>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rounded-xl border border-line bg-canvas p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm text-ink-2">Theme</span>
            <ThemeToggle />
          </div>
          <div className="border-t border-line px-2 py-1.5" role="none">
            <LogoutButton ghost />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop identity strip */}
        <div className="hidden justify-end border-b border-line bg-canvas px-6 py-2.5 md:flex">
          <p className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-accent-ink"
            >
              {initials(name)}
            </span>
            <span className="min-w-0 text-right">
              <span className="block max-w-40 truncate text-sm font-medium leading-tight">{name}</span>
              <span className="block text-xs leading-tight text-ink-3">{roleLabel}</span>
            </span>
          </p>
        </div>
        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-canvas px-4 py-3 md:hidden">
          <p className="text-sm font-semibold tracking-[0.2em]">SCIENCELAB</p>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-accent-ink"
            >
              {initials(name)}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2"
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
        </header>
        {open ? (
          <nav aria-label="Mobile" className="border-b border-line bg-surface px-4 py-3 md:hidden">
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <button
                    type="button"
                    onClick={() => go(l.href)}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-raised ${
                      isActive(l.href) ? "bg-raised text-ink" : "text-ink-2"
                    }`}
                  >
                    <l.icon />
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-line pt-3">
              <LogoutButton />
            </div>
          </nav>
        ) : null}
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
