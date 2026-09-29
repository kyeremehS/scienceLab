"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type JoinedClass = {
  id: string;
  name: string;
  description: string | null;
  teacherName: string;
  joinedAt: Date | string;
};

/**
 * One joined-class row. Leave transforms the whole row into a single
 * confirm bar (message + grouped actions sharing one baseline) instead of
 * crowding controls into a corner. Leaving is non-destructive: membership
 * ends, learning history stays, rejoining uses the same class code.
 */
export function JoinedClassRow({ classInfo }: { classInfo: JoinedClass }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classInfo.id}/leave`, { method: "POST" });
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

  if (confirming) {
    return (
      <li className="flex items-center justify-between gap-6 rounded-lg border border-line bg-surface px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-ink-2">
          Leave {classInfo.name}? You can rejoin anytime with the class code from your teacher.
        </p>
        {error ? (
          <p role="alert" className="shrink-0 text-xs text-error">
            {error}
          </p>
        ) : null}
        <span className="flex shrink-0 items-center gap-3">
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
          <button
            type="button"
            disabled={pending}
            onClick={leave}
            className="rounded-lg border border-line px-3 py-1 text-[13px] font-medium text-error disabled:opacity-50"
          >
            Leave class
          </button>
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-base font-semibold">
          <Link
            href={`/dashboard/student/classes/${classInfo.id}`}
            className="underline decoration-line underline-offset-4 hover:text-accent-ink"
          >
            {classInfo.name}
          </Link>
        </p>
        {classInfo.description ? (
          <p className="mt-0.5 text-sm text-ink-2">{classInfo.description}</p>
        ) : null}
        <p className="mt-1 text-sm text-ink-3">
          {classInfo.teacherName} · joined {new Date(classInfo.joinedAt).toLocaleDateString()}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 self-center text-[13px] font-medium text-[#6366F1]"
      >
        Leave
      </button>
    </li>
  );
}
