"use client";

import { useEffect, useState } from "react";

type Exchange = { id: string; question: string; response: string };

const SUGGESTIONS = [
  "What should I check first?",
  "Explain this step simply",
  "What happens if I get this wrong?",
];

function parseSseEvents(text: string): { done: boolean; text: string } {
  let out = "";
  let done = false;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") {
      done = true;
      continue;
    }
    try {
      const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
      out += json.choices?.[0]?.delta?.content ?? "";
    } catch {
      // Partial JSON across chunk boundaries; recovered from later bytes.
    }
  }
  return { done, text: out };
}

/**
 * Contextual AI panel (FR-STU-17–FR-STU-20): streams the answer,
 * surfaces past exchanges, and never blocks step navigation.
 */
export function AIPanel({ attemptId, stepId }: { attemptId: string; stepId: string | null }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[] | null>(null);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [wasFallback, setWasFallback] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attempts/${attemptId}/assist/history`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          interactions?: Exchange[];
        } | null;
        if (!cancelled && data?.interactions) setHistory(data.interactions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setError("Type a question first.");
      return;
    }
    setPending(true);
    setError(null);
    setStreaming("");
    setWasFallback(false);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, experimentStepId: stepId, stream: true }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/event-stream") || !res.body) {
        // Non-stream answer (fallback JSON or error).
        const data = (await res.json().catch(() => null)) as {
          response?: string;
          fallback?: boolean;
          error?: string;
        } | null;
        if (!res.ok || !data?.response) {
          setError(data?.error ?? "Could not get help right now.");
          setStreaming(null);
          setPending(false);
          return;
        }
        setStreaming(data.response);
        setWasFallback(data.fallback === true);
        setHistory((h) => [...(h ?? []), { id: `local-${Date.now()}`, question: trimmed, response: data.response as string }]);
        setQuestion("");
        setPending(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const parsed = parseSseEvents(decoder.decode(value, { stream: true }));
        if (parsed.text) {
          full += parsed.text;
          setStreaming(full);
        }
      }
      setStreaming(full.length > 0 ? full : null);
      if (full.length > 0) {
        setQuestion("");
        setHistory((h) => [...(h ?? []), { id: `local-${Date.now()}`, question: trimmed, response: full }]);
      } else {
        setError("Could not get help right now.");
      }
    } catch {
      setError("Could not get help right now.");
      setStreaming(null);
    }
    setPending(false);
  }

  return (
    <div>
      {history && history.length > 0 ? (
        <ul className="mb-3 flex max-h-48 flex-col gap-2 overflow-y-auto" aria-label="Past help">
          {history.slice(-3).map((h) => (
            <li key={h.id} className="rounded-lg border border-line bg-canvas px-3 py-2">
              <p className="text-xs font-medium">{h.question}</p>
              <p className="mt-1 line-clamp-2 text-xs text-ink-2">{h.response}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => ask(s)}
            className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 transition-colors hover:bg-raised disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
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
        className="mt-2 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => ask(question)}
        disabled={pending}
        className="mt-2 rounded-lg border border-line px-4 py-1.5 text-sm font-medium transition-opacity disabled:opacity-50"
      >
        {pending ? "Asking…" : "Ask for help"}
      </button>
      {streaming !== null ? (
        <div className="mt-3 rounded-lg border border-line bg-canvas px-4 py-3">
          {wasFallback ? (
            <p className="mb-1 font-mono text-xs text-ink-3">OFFLINE HELP</p>
          ) : null}
          <p className="whitespace-pre-line text-sm text-ink-2">{streaming}</p>
        </div>
      ) : null}
    </div>
  );
}
