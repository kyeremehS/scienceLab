"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Two-step leave control, vertically centered against the class card.
 * Leaving is non-destructive: membership ends, learning history stays.
 */
export function LeaveClassButton({ classId, className }: { classId: string; className: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/leave`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not leave the class.");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not leave the class.");
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 self-center text-[13px] font-medium text-[#6366F1]"
      >
        Leave
      </button>
    );
  }
  return (
    <span className="flex shrink-0 flex-col items-end justify-center gap-1 self-center">
      <span className="text-xs text-ink-2">
        Leave {className}? You can rejoin anytime with the class code from your teacher.
      </span>
      {error ? (
        <span role="alert" className="text-xs text-error">
          {error}
        </span>
      ) : null}
      <span className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={leave}
          className="rounded-lg border border-line px-3 py-1 text-[13px] font-medium text-error disabled:opacity-50"
        >
          Leave class
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="text-[13px] font-medium text-ink-3 underline underline-offset-4"
        >
          Stay
        </button>
      </span>
    </span>
  );
}
