"use client";

import { useState } from "react";

/**
 * Copy action for the class code. `code` (default) renders the code itself
 * as a compact mono chip — the copy affordance is the whole chip;
 * `action` renders the spec's labeled teal button (pp.6, Invite students).
 */
export function CopyCodeButton({
  code,
  variant = "code",
}: {
  code: string;
  variant?: "code" | "action";
}) {
  const [copied, setCopied] = useState(false);
  const isAction = variant === "action";

  async function onClick() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Code copied" : "Copy class code"}
      aria-live="polite"
      className={
        isAction
          ? "rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-teal-deep"
          : "rounded-lg border border-line px-3 py-1.5 font-mono text-sm font-semibold transition-colors hover:bg-raised"
      }
    >
      {copied ? "Copied" : isAction ? "Copy class code" : code}
    </button>
  );
}
