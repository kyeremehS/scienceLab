"use client";

import { useState } from "react";

/**
 * Contextual AI panel (FR-STU-17–FR-STU-20). Fire-and-forget from the
 * workflow's perspective: asking never blocks step navigation, and an AI
 * outage surfaces the server fallback while the experiment continues.
 */
export function AIPanel({ attemptId, stepId }: { attemptId: string; stepId: string | null }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [wasFallback, setWasFallback] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (question.trim().length === 0) {
      setError("Type a question first.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), experimentStepId: stepId }),
      });
      const data = (await res.json().catch(() => null)) as {
        response?: string;
        fallback?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.response) {
        setError(data?.error ?? "Could not get help right now.");
        setPending(false);
        return;
      }
      setAnswer(data.response);
      setWasFallback(data.fallback === true);
    } catch {
      setError("Could not get help right now.");
    }
    setPending(false);
  }

  return (
    <div>
      <label htmlFor="ai-question" className="sr-only">
        Ask for help with this step
      </label>
      <textarea
        id="ai-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Stuck? Ask about this step…"
        disabled={pending}
        className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={ask}
        disabled={pending}
        className="mt-2 rounded-lg border border-line px-4 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
      >
        {pending ? "Asking…" : "Ask for help"}
      </button>
      {answer ? (
        <div className="mt-3 rounded-lg border border-line bg-canvas px-4 py-3">
          {wasFallback ? (
            <p className="mb-1 font-mono text-xs text-ink-3">OFFLINE HELP</p>
          ) : null}
          <p className="text-sm text-ink-2">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}
