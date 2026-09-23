"use client";

import { useEffect, useState } from "react";

type AssignmentProgress = {
  assignmentId: string;
  experimentId: string;
  title: string;
  dueAt: string | null;
  counts: { total: number; notStarted: number; inProgress: number; completed: number };
};

/** Teacher class progress: per-assignment counts derived from learning state. */
export function ClassProgress({ classId }: { classId: string }) {
  const [data, setData] = useState<AssignmentProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/classes/${classId}/progress`)
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          progress?: AssignmentProgress[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.progress) setError(json?.error ?? "Could not load progress.");
        else setData(json.progress);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load progress.");
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-error">
        {error}
      </p>
    );
  }
  if (!data) {
    return <p className="text-sm text-ink-2">Loading progress…</p>;
  }
  if (data.length === 0) {
    return (
      <p className="text-sm text-ink-2">
        No active assignments — assign an experiment (Phase 7) to see class progress here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {data.map((a) => (
        <li key={a.assignmentId} className="rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-base font-semibold">{a.title}</p>
          <dl className="mt-2 grid grid-cols-4 gap-2" aria-label={`${a.title} progress`}>
            {[
              ["TOTAL", a.counts.total],
              ["NOT STARTED", a.counts.notStarted],
              ["IN PROGRESS", a.counts.inProgress],
              ["COMPLETED", a.counts.completed],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-xs text-ink-3">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
