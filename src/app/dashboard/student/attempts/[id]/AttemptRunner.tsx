"use client";

import { useState } from "react";
import type { buildAttemptState } from "@/lib/attempts-service";
import { NavLink } from "@/app/NavLink";
import { AIPanel } from "./AIPanel";
import { AssessmentSection } from "./AssessmentSection";

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
    <div>
      <p className="text-sm">
        <span className="font-medium">{observation.prompt}</span>{" "}
        <span className="font-mono text-xs text-ink-3">
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

/** Experiment workspace, focus mode: one step, one action, quiet chrome (FR-STU-10–FR-STU-16). */
export function AttemptRunner({ initial, title }: { initial: AttemptState; title: string }) {
  const [state, setState] = useState<AttemptState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [stepPending, setStepPending] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

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

  const doneCount = state.progress.completedSteps;
  const totalCount = state.progress.totalSteps;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const currentPosition = selectedIndex >= 0 ? selectedIndex + 1 : doneCount;

  function missingObservationCount(s: StepState): number {
    return s.observations.filter((o) => o.required && !o.observationId).length;
  }

  /** Jump to the first step still missing a required observation (or step). */
  function focusFirstIncomplete() {
    const stepWithMissingObs = state.steps.find((s) => missingObservationCount(s) > 0);
    if (stepWithMissingObs) {
      setSelectedId(stepWithMissingObs.id);
      return;
    }
    const incomplete = state.steps.find((s) => s.status !== "COMPLETED");
    if (incomplete) setSelectedId(incomplete.id);
    document.getElementById("step-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Sticky workspace header: back, title, live position. Static on
          mobile where the shell header already sticks. */}
      <div className="md:sticky md:top-0 md:z-20 md:-mx-6 md:border-b md:border-line md:bg-canvas/95 md:px-6 md:py-3 md:backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <NavLink
            href={`/dashboard/student/experiments/${state.attempt.experimentId}`}
            arrow="back"
            className="shrink-0"
          >
            Experiment
          </NavLink>
          <p className="min-w-0 truncate text-sm font-semibold">{title}</p>
          <p className="ml-auto shrink-0 font-mono text-xs text-ink-3">
            STEP {currentPosition} OF {totalCount}
          </p>
        </div>
      </div>
      {/* Slim progress header: trace + dots + observation count */}
      <div>
        <div
          className="h-1 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label="Experiment progress"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Step dots: jump anywhere; completed steps stay completed */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Steps">
          {state.steps.map((s) => {
            const active = s.id === selected.id;
            const done = s.status === "COMPLETED";
            const missing = missingObservationCount(s);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                aria-label={`Step ${s.order}: ${s.title}, ${done ? "completed" : s.status === "CURRENT" ? "current" : "not started"}${missing > 0 ? `, ${missing} required observation${missing === 1 ? "" : "s"} missing` : ""}`}
                aria-current={active ? "step" : undefined}
                title={missing > 0 ? `${missing} required observation${missing === 1 ? "" : "s"} missing` : undefined}
                className={`relative flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors ${
                  active
                    ? "border-accent font-semibold text-accent-ink"
                    : done
                      ? "border-line bg-raised text-ink-2"
                      : "border-line text-ink-3 hover:text-ink-2"
                }`}
              >
                <span aria-hidden="true">{done ? "✓" : s.order}</span>
                {missing > 0 ? (
                  <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-copper" />
                ) : null}
              </button>
            );
          })}
          </div>
          <p className="font-mono text-xs text-ink-3">
            {state.progress.requiredObservationsRecorded}/{state.progress.requiredObservationsTotal} OBSERVATIONS
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {/* Current step focus */}
      <section aria-labelledby="step-title">
        <p className="text-xs font-semibold tracking-[0.15em] text-ink-3">
          STEP {selected.order} · {selected.status.replace("_", " ")}
        </p>
        <h2 id="step-title" className="mt-2 text-2xl font-semibold tracking-tight">
          {selected.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-2">{selected.instructions}</p>

        {selected.observations.length > 0 && (
          <div aria-label="Observations" className="mt-6 flex flex-col gap-5">
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
          </div>
        )}

        <div className="mt-8 flex items-center gap-4">
          {!readOnly && !finished && selected.status !== "COMPLETED" && (
            <button
              type="button"
              disabled={stepPending}
              onClick={() => completeStep(selected.id)}
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
            >
              {stepPending ? "Saving…" : "Mark step complete & continue →"}
            </button>
          )}
          {selectedIndex > 0 && (
            <button
              type="button"
              onClick={() => setSelectedId(state.steps[selectedIndex - 1].id)}
              className="text-sm font-medium text-ink-3 underline underline-offset-4 hover:text-ink-2"
            >
              ← Back
            </button>
          )}
        </div>

        {finished && (
          <div className="border-t border-line pt-6">
            <AssessmentSection
              attemptId={state.attempt.id}
              onCompleted={setState}
              onBlocked={focusFirstIncomplete}
            />
          </div>
        )}
      </section>

      {/* Collapsible AI help */}
      <div className="border-t border-line pt-6">
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          aria-expanded={aiOpen}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-xs font-semibold tracking-[0.15em] text-ink-3">NEED HELP WITH THIS STEP?</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink-3">
            <path d={aiOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
        {aiOpen ? (
          <div className="pt-3">
            {readOnly ? (
              <p className="text-sm text-ink-2">
                This experiment is completed — assistance is available while work is in progress.
              </p>
            ) : (
              <AIPanel attemptId={state.attempt.id} stepId={selected.id} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
