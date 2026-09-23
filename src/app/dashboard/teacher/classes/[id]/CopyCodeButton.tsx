"use client";

import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

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
      className="rounded-lg border border-line px-3 py-1.5 font-mono text-sm font-semibold transition-colors hover:bg-raised"
    >
      {copied ? "Copied" : code}
    </button>
  );
}
