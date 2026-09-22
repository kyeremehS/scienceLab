"use client";

import { useState } from "react";
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

/**
 * Sidebar account card: avatar + name/role row opening a menu with the
 * theme toggle and a de-emphasized logout. One cohesive unit.
 */
export function AccountMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative rounded-xl border border-line bg-canvas p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-raised"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-accent-ink"
        >
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block text-xs text-ink-3">{role}</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink-3">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute inset-x-0 bottom-full z-20 mb-2 rounded-xl border border-line bg-surface p-2"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm text-ink-2">Theme</span>
            <ThemeToggle />
          </div>
          <div className="border-t border-line px-2 py-1.5" role="none">
            <LogoutButton ghost />
          </div>
        </div>
      ) : null}
    </div>
  );
}
