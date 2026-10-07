"use client";

import { useEffect, useRef, useState } from "react";

type Exchange = { id: string; question: string; response: string };

const SUGGESTIONS = [
  "What should I check first?",
  "Explain this step simply",
  "What happens if I get this wrong?",
];

function parseSseEvents(text: string): string {
  let out = "";
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") continue;
    try {
      const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
      out += json.choices?.[0]?.delta?.content ?? "";
    } catch {
      // Partial JSON across chunk boundaries; recovered from later bytes.
    }
  }
  return out;
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

/**
 * Chat-style AI help (FR-STU-17–FR-STU-20): threaded bubbles that stream
 * in, auto-scroll to the latest message, suggestions to start, and a
 * docked composer. Never blocks step navigation.
 */
export function AIPanel({ attemptId, stepId }: { attemptId: string; stepId: string | null }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[] | null>(null);
  const [streaming, setStreaming] = useState<{ question: string; text: string; fallback: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  async function loadHistory() {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/assist/history`);
      const data = (await res.json().catch(() => null)) as {
        interactions?: Exchange[];
      } | null;
      if (data?.interactions) setHistory(data.interactions);
    } catch {
      // History is a nicety; the panel works without it.
    }
  }

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

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [history, streaming]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (trimmed.length === 0 || pending) {
      if (trimmed.length === 0) setError("Type a question first.");
      return;
    }
    setPending(true);
    setError(null);
    setStreaming({ question: trimmed, text: "", fallback: false });
    setQuestion("");
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
        setStreaming({ question: trimmed, text: data.response, fallback: data.fallback === true });
        if (data.fallback !== true) {
          await loadHistory();
          // The exchange now lives in history; drop the live copy to avoid a duplicate.
          // Fallbacks are never logged, so they stay visible as the live message.
          setStreaming(null);
        }
        setPending(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const piece = parseSseEvents(decoder.decode(value, { stream: true }));
        if (piece) {
          full += piece;
          setStreaming({ question: trimmed, text: full, fallback: false });
        }
      }
      if (full.length === 0) {
        setError("Could not get help right now.");
        setStreaming(null);
      } else {
        await loadHistory();
        setStreaming(null);
      }
    } catch {
      setError("Could not get help right now.");
      setStreaming(null);
    }
    setPending(false);
  }

  const thread: (Exchange & { fallback?: boolean })[] = [
    ...(history ?? []),
    ...(streaming ? [{ id: "live", question: streaming.question, response: streaming.text, fallback: streaming.fallback }] : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      {thread.length > 0 ? (
        <div ref={threadRef} aria-live="polite" aria-label="Conversation" className="flex max-h-80 flex-col gap-4 overflow-y-auto pr-1">
          {thread.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-raised px-3.5 py-2 text-sm">
                {m.question}
              </p>
              <div className="pr-2">
                {m.fallback ? (
                  <p className="mb-1 font-mono text-[11px] text-ink-3">OFFLINE HELP</p>
                ) : (
                  <p className="mb-1 font-mono text-[11px] text-ink-3">INLING</p>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                  {m.response}
                  {m.id === "live" && pending ? (
                    <span aria-hidden="true" className="animate-pulse"> ▍</span>
                  ) : null}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
      )}
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex items-end gap-2"
      >
        <label htmlFor="ai-question" className="sr-only">
          Ask for help with this step
        </label>
        <textarea
          id="ai-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Stuck? Ask about this step…"
          disabled={pending}
          className="max-h-32 min-h-[42px] flex-1 resize-y rounded-xl border border-line bg-transparent px-3.5 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending || question.trim().length === 0}
          aria-label="Send question"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-50"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
