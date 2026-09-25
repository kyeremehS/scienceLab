"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RemoveMemberButton({ classId, studentId, studentName }: { classId: string; studentId: string; studentName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onRemove() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/classes/${classId}/members/${studentId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not remove the student.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Could not remove the student.");
    } finally {
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${studentName} from class`}
        className="rounded-lg border border-line px-3 py-1.5 text-sm transition-colors hover:bg-raised"
      >
        Remove
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => { setConfirming(false); setError(null); }}
        className="rounded-lg border border-line px-3 py-1.5 text-sm"
      >
        Cancel
      </button>
      {error ? (
        <span role="alert" className="text-sm text-error">{error}</span>
      ) : null}
    </span>
  );
}
