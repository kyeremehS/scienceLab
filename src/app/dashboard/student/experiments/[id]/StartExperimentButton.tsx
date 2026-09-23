"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Start-or-resume button for the experiment detail page (FR-STU-08/09). */
export function StartExperimentButton({
  experimentId,
  hasAttempt,
}: {
  experimentId: string;
  hasAttempt: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/experiments/${experimentId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as {
        attempt?: { attempt: { id: string } };
        error?: string;
      } | null;
      if (!res.ok || !data?.attempt) {
        setError(data?.error ?? "Could not start the experiment.");
        setPending(false);
        return;
      }
      router.push(`/dashboard/student/attempts/${data.attempt.attempt.id}`);
    } catch {
      setError("Could not start the experiment.");
      setPending(false);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-error">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        {pending ? "Starting…" : hasAttempt ? "Continue experiment" : "Start experiment"}
      </button>
    </div>
  );
}
