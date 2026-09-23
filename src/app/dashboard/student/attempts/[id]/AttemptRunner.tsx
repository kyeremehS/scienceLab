"use client";

import { useState } from "react";
import type { buildAttemptState } from "@/lib/attempts-service";
import { AIPanel } from "./AIPanel";

type AttemptState = Awaited<ReturnType<typeof buildAttemptState>>;
type StepState = AttemptState["steps"][number];
type ObservationState = StepState["observations"][number];

function ObservationBox({
  attemptId,
  observation,
  disabled,
  onChanged,
  onError,
}: {
  attemptId: string;
  observation: ObservationState;
  disabled: boolean;
  onChanged: (state: AttemptState) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState(observation.responseText ?? "");
  const [editing, setEditing] = useState(observation.observationId === null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (draft.trim().length === 0) {
      onError("Observation text is required.");
      return;
    }
    setPending(true);
    try {
      const isNew = observation.observationId === null;
      const url = isNew
        ? `/api/attempts/${attemptId}/observations`
        : `/api/attempts/${attemptId}/observations/${observation.observationId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew
            ? { observationDefinitionId: observation.definitionId, responseText: draft }
            : { responseText: draft },
        ),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        onError(data?.error ?? "Could not save the observation.");
        setPending(false);
        return;
      }
      // Re-read authoritative state so progress counts stay truthful.
      const stateRes = await fetch(`/api/attempts/${attemptId}`);
      const stateData = (await stateRes.json().catch(() => null)) as {
        attempt?: AttemptState;
        error?: string;
      } | null;
      if (!stateRes.ok || !stateData?.attempt) {
        onError(stateData?.error ?? "Saved, but the updated state could not be loaded. Refresh the page.");
        setPending(false);
        return;
      }
      onChanged(stateData.attempt);
      setEditing(false);
    } catch {
      onError("Could not save the observation.");
    }
    setPending(false);
  }

  return (
    <div className="rounded-lg border border-line bg-canvas px-4 py-3">
      <p className="text-sm font-medium">
        {observation.prompt}{" "}
        <span className="ml-1 font-mono text-xs text-ink-3">
          {observation.required ? "REQUIRED" : "OPTIONAL"}
        </span>
      </p>
      {!editing && observation.responseText !== null ? (
        <div className="mt-2">
          <p className="text-sm text-ink-2">{observation.responseText}</p>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                setDraft(observation.responseText ?? "");
                setEditing(true);
              }}
              className="mt-2 text-sm font-medium text-accent-ink underline"
            >
              Edit
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <label htmlFor={`obs-${observation.definitionId}`} className="sr-only">
            {observation.prompt}
          </label>
          <textarea
            id={`obs-${observation.definitionId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={disabled || pending}
            className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
          />
          {!disabled && (
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="self-start rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
            >
              {pending ? "Saving…" : observation.observationId ? "Save changes" : "Record observation"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Experiment workspace: step navigator + content pane (FR-STU-10–FR-STU-16). */
export function AttemptRunner({
  initial,
  title,
}: {
  initial: AttemptState;
  title: string;
}) {
  const [state, setState] = useState<AttemptState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [stepPending, setStepPending] = useState(false);

  const currentId = state.progress.currentStepId;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: StepState | undefined =
    state.steps.find((s) => s.id === (selectedId ?? currentId ?? state.steps[0]?.id)) ??
    state.steps[0];
  const selectedIndex = state.steps.findIndex((s) => s.id === selected?.id);
  const finished = state.progress.totalSteps > 0 && state.progress.completedSteps >= state.progress.totalSteps;
  const readOnly = state.attempt.status !== "IN_PROGRESS";

  async function completeStep(stepId: string) {
    setStepPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${state.attempt.id}/steps/${stepId}/complete`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        attempt?: AttemptState;
        error?: string;
      } | null;
      if (!res.ok || !data?.attempt) {
        setError(data?.error ?? "Could not complete the step.");
        setStepPending(false);
        return;
      }
      setState(data.attempt);
      setSelectedId(data.attempt.progress.currentStepId);
    } catch {
      setError("Could not complete the step.");
    }
    setStepPending(false);
  }

  if (!selected) {
    return <p className="text-sm text-ink-2">This experiment has no steps yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <dl
        aria-label="Attempt progress"
        className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-surface px-5 py-4"
      >
        {[
          ["STEP", `${state.progress.completedSteps} / ${state.progress.totalSteps}`],
          [
            "OBSERVATIONS",
            `${state.progress.requiredObservationsRecorded} / ${state.progress.requiredObservationsTotal}`,
          ],
          ["STATUS", state.attempt.status === "IN_PROGRESS" ? "In progress" : "Completed"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-xs text-ink-3">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <nav aria-label="Experiment steps" className="lg:col-span-1">
          <ol className="flex flex-col gap-2">
            {state.steps.map((s) => {
              const active = s.id === selected.id;
              const marker = s.status === "COMPLETED" ? "✓" : s.status === "CURRENT" ? "→" : "·";
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-current={active ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                      active ? "border-line bg-raised" : "border-line bg-surface"
                    }`}
                  >
                    <span aria-hidden="true" className="font-mono text-sm text-ink-3">
                      {marker}
                    </span>
                    <span>
                      <span className="block font-mono text-xs text-ink-3">STEP {s.order}</span>
                      <span className="block text-sm font-medium">{s.title}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <section
            aria-labelledby="step-title"
            className="rounded-xl border border-line bg-surface px-5 py-4"
          >
            <p className="text-xs font-semibold tracking-[0.15em] text-ink-3">
              STEP {selected.order} · {selected.status.replace("_", " ")}
            </p>
            <h2 id="step-title" className="mt-1 text-xl font-semibold tracking-tight">
              {selected.title}
            </h2>
            <p className="mt-2 text-sm text-ink-2">{selected.instructions}</p>
            <p className="mt-3 text-xs text-ink-3">{title} — perform this step with your physical materials.</p>
          </section>

          {selected.observations.length > 0 && (
            <section aria-label="Observations" className="flex flex-col gap-3">
              {selected.observations.map((o) => (
                <ObservationBox
                  key={o.definitionId}
                  attemptId={state.attempt.id}
                  observation={o}
                  disabled={readOnly}
                  onChanged={setState}
                  onError={setError}
                />
              ))}
            </section>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => setSelectedId(state.steps[selectedIndex - 1].id)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              ← Previous
            </button>
            {!readOnly && !finished && selected.status !== "COMPLETED" && (
              <button
                type="button"
                disabled={stepPending}
                onClick={() => completeStep(selected.id)}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
              >
                {stepPending ? "Saving…" : "Mark step complete →"}
              </button>
            )}
            {selectedIndex < state.steps.length - 1 && (
              <button
                type="button"
                onClick={() => setSelectedId(state.steps[selectedIndex + 1].id)}
                className="text-sm font-medium text-accent-ink underline"
              >
                Review next step →
              </button>
            )}
          </div>

          {finished && (
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-2">
              All steps are complete. Assessment and results arrive with Phase 6 — your step
              progress and observations above are saved.
            </p>
          )}

          <aside
            aria-label="AI assistance"
            className="rounded-xl border border-line bg-surface px-5 py-4"
          >
            <p className="text-xs font-semibold tracking-[0.15em] text-ink-3">AI HELP</p>
            <div className="mt-2">
              {readOnly ? (
                <p className="text-sm text-ink-2">
                  This experiment is completed — assistance is available while work is in progress.
                </p>
              ) : (
                <AIPanel attemptId={state.attempt.id} stepId={selected.id} />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
