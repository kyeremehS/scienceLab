"use client";

import { useCallback, useEffect, useState } from "react";

type Assignment = {
  id: string;
  experimentId: string;
  experimentTitle: string;
  status: "ACTIVE" | "CLOSED" | "CANCELLED";
  assignedAt: string;
  startAt: string | null;
  dueAt: string | null;
};

type ExperimentOption = {
  experimentId: string;
  title: string;
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function toInputValue(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Teacher assignment management: assign, update dates, close/cancel (FR-TEA-15–FR-TEA-24). */
export function AssignmentsManager({ classId }: { classId: string }) {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [experiments, setExperiments] = useState<ExperimentOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [experimentId, setExperimentId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editDue, setEditDue] = useState("");
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/classes/${classId}/assignments`);
    const json = (await res.json().catch(() => null)) as {
      assignments?: Assignment[];
      error?: string;
    } | null;
    if (!res.ok || !json?.assignments) {
      setError(json?.error ?? "Could not load assignments.");
      return;
    }
    setAssignments(json.assignments);
  }, [classId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await reload();
      } catch {
        if (!cancelled) setError("Could not load assignments.");
      }
      try {
        const res = await fetch("/api/experiments");
        const json = (await res.json().catch(() => null)) as {
          experiments?: ExperimentOption[];
        } | null;
        if (!cancelled && json?.experiments) setExperiments(json.experiments);
      } catch {
        // Experiment options are a convenience; the list works without them.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [classId, reload]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch(`/api/classes/${classId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId,
          startAt: startAt || null,
          dueAt: dueAt || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Could not create the assignment.");
        setCreating(false);
        return;
      }
      setExperimentId("");
      setStartAt("");
      setDueAt("");
      await reload();
    } catch {
      setError("Could not create the assignment.");
    }
    setCreating(false);
  }

  async function saveDates(a: Assignment) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/classes/${classId}/assignments/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: editStart || null, dueAt: editDue || null }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Could not update the assignment.");
        setBusy(false);
        return;
      }
      setEditingId(null);
      await reload();
    } catch {
      setError("Could not update the assignment.");
    }
    setBusy(false);
  }

  async function close(a: Assignment, status: "CLOSED" | "CANCELLED") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/classes/${classId}/assignments/${a.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Could not close the assignment.");
        setBusy(false);
        return;
      }
      setConfirmClose(null);
      await reload();
    } catch {
      setError("Could not close the assignment.");
    }
    setBusy(false);
  }

  if (!assignments) {
    return <p className="text-sm text-ink-2">{error ? error : "Loading assignments…"}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="current-assignments">
        <h2 id="current-assignments" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          ASSIGNMENTS ({assignments.length})
        </h2>
        {assignments.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">
            No assignments yet — assign a published experiment below to give this class work.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {assignments.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-base font-semibold">{a.experimentTitle}</p>
                  <p className="shrink-0 font-mono text-xs text-ink-3">{a.status}</p>
                </div>
                <p className="mt-1 text-sm text-ink-3">
                  Assigned {new Date(a.assignedAt).toLocaleDateString()} · Start {fmtDate(a.startAt)} · Due {fmtDate(a.dueAt)}
                </p>
                {a.status === "ACTIVE" ? (
                  <div className="mt-3">
                    {editingId === a.id ? (
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium">Start</span>
                          <input
                            type="datetime-local"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                            className="rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium">Due</span>
                          <input
                            type="datetime-local"
                            value={editDue}
                            onChange={(e) => setEditDue(e.target.value)}
                            className="rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => saveDates(a)}
                          className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
                        >
                          Save dates
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-sm font-medium text-ink-3 underline underline-offset-4"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : confirmClose === a.id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-ink-2">Close or cancel? History is preserved.</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => close(a, "CLOSED")}
                          className="rounded-lg border border-line px-4 py-1.5 text-sm font-medium disabled:opacity-50"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => close(a, "CANCELLED")}
                          className="rounded-lg border border-line px-4 py-1.5 text-sm font-medium text-error disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClose(null)}
                          className="text-sm font-medium text-ink-3 underline underline-offset-4"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(a.id);
                            setEditStart(toInputValue(a.startAt));
                            setEditDue(toInputValue(a.dueAt));
                            setConfirmClose(null);
                          }}
                          className="text-[13px] font-medium text-[#5dcaa5]"
                        >
                          Edit dates
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmClose(a.id);
                            setEditingId(null);
                          }}
                          className="text-[13px] font-medium text-[#5dcaa5]"
                        >
                          Close…
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="new-assignment">
        <h2 id="new-assignment" className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          NEW ASSIGNMENT
        </h2>
        <form onSubmit={create} className="mt-3 flex max-w-[520px] flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="assign-experiment" className="text-sm font-medium">Experiment</label>
            <select
              id="assign-experiment"
              required
              value={experimentId}
              onChange={(e) => setExperimentId(e.target.value)}
              className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Choose a published experiment…</option>
              {(experiments ?? []).map((e) => (
                <option key={e.experimentId} value={e.experimentId}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Start (optional)</span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Due (optional)</span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={creating || !experimentId}
            className="self-start rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
          >
            Assign experiment
          </button>
        </form>
      </section>
    </div>
  );
}
