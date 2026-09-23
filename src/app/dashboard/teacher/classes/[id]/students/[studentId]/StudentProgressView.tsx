"use client";

import { useEffect, useState } from "react";

type AttemptProgress = {
  experimentId: string;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  stepsCompleted: number;
  stepsTotal: number;
  requiredObservationsRecorded: number;
  requiredObservationsTotal: number;
  score: string | null;
  completedAt: string | null;
};

function pct(score: string | null): string {
  if (score === null) return "—";
  return `${Math.round(Number(score) * 100)}%`;
}

function AttemptRow({ a }: { a: AttemptProgress }) {
  return (
    <li className="rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-base font-semibold">{a.title}</p>
      <p className="mt-0.5 font-mono text-xs text-ink-3">
        {a.status.replace("_", " ")}
        {a.completedAt ? ` · COMPLETED ${new Date(a.completedAt).toLocaleDateString()}` : ""}
      </p>
      {a.status !== "NOT_STARTED" ? (
        <dl className="mt-2 grid grid-cols-3 gap-2">
          {[
            ["STEPS", `${a.stepsCompleted}/${a.stepsTotal}`],
            ["OBSERVATIONS", `${a.requiredObservationsRecorded}/${a.requiredObservationsTotal}`],
            ["SCORE", pct(a.score)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-xs text-ink-3">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

/** Teacher view of one student's progress: assigned plus independent work. */
export function StudentProgressView({
  classId,
  studentId,
}: {
  classId: string;
  studentId: string;
}) {
  const [data, setData] = useState<{
    student: { name: string };
    assigned: AttemptProgress[];
    independent: AttemptProgress[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/classes/${classId}/students/${studentId}/progress`)
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          student?: { name: string };
          assigned?: AttemptProgress[];
          independent?: AttemptProgress[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.student) setError(json?.error ?? "Could not load progress.");
        else setData({ student: json.student, assigned: json.assigned ?? [], independent: json.independent ?? [] });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load progress.");
      });
    return () => {
      cancelled = true;
    };
  }, [classId, studentId]);

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
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="assigned-progress">
        <h2 id="assigned-progress" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          ASSIGNED WORK ({data.assigned.length})
        </h2>
        {data.assigned.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">No active assignments for this class.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {data.assigned.map((a) => (
              <AttemptRow key={a.experimentId} a={a} />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="independent-progress">
        <h2 id="independent-progress" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          INDEPENDENT WORK ({data.independent.length})
        </h2>
        {data.independent.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">No independent experiments.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {data.independent.map((a) => (
              <AttemptRow key={a.experimentId} a={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
