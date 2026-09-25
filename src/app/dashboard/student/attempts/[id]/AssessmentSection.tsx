"use client";

import { useEffect, useState } from "react";
import type { buildAttemptState } from "@/lib/attempts-service";

type AttemptState = Awaited<ReturnType<typeof buildAttemptState>>;

type Question = {
  id: string;
  order: number;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  questionText: string;
  options: string[] | null;
};

type ResultData = {
  status: string;
  completedAt: string | null;
  score: string;
  feedback: string | null;
  answers: { id: string; answerText: string; isCorrect: boolean | null; questionText: string; order: number }[];
};

function ResultView({ result }: { result: ResultData }) {
  const pct = Math.round(Number(result.score) * 100);
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3" aria-label="Assessment result">
        <div>
          <dt className="font-mono text-xs text-ink-3">SCORE</dt>
          <dd className="mt-0.5 text-2xl font-semibold tracking-tight">{pct}%</dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-ink-3">STATUS</dt>
          <dd className="mt-0.5 text-sm font-semibold">
            {result.status === "COMPLETED" ? "Completed" : "Submitted"}
          </dd>
        </div>
      </dl>
      {result.feedback ? <p className="text-sm text-ink-2">{result.feedback}</p> : null}
      <ul className="flex flex-col gap-3">
        {result.answers.map((a) => (
          <li key={a.id}>
            <p className="text-sm">
              <span aria-hidden="true" className="mr-2 font-mono text-xs text-ink-3">
                {a.isCorrect ? "✓" : "✗"}
              </span>
              <span className="font-medium">{a.questionText}</span>
            </p>
            <p className="mt-1 pl-6 text-sm text-ink-2">{a.answerText}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Assessment + completion + result (FR-STU-21–FR-STU-29). Shown once all
 * steps are done; submit-once with safe retry, then an explicit complete
 * action that reports exactly what remains when blocked.
 */
export function AssessmentSection({
  attemptId,
  onCompleted,
  onBlocked,
}: {
  attemptId: string;
  onCompleted: (state: AttemptState) => void;
  onBlocked: () => void;
}) {
  const [assessment, setAssessment] = useState<{
    id: string;
    title: string;
    instructions: string;
    questions: Question[];
  } | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const aRes = await fetch(`/api/attempts/${attemptId}/assessment`);
      const aJson = (await aRes.json().catch(() => null)) as {
        assessment?: { id: string; title: string; instructions: string; questions: Question[] };
        error?: string;
      } | null;
      if (cancelled) return;
      if (!aRes.ok || !aJson?.assessment) {
        setError(aJson?.error ?? "Could not load the assessment.");
        return;
      }
      setAssessment(aJson.assessment);
      const rRes = await fetch(`/api/attempts/${attemptId}/result`);
      if (cancelled) return;
      if (rRes.ok) {
        const rJson = (await rRes.json().catch(() => null)) as { result?: ResultData } | null;
        if (rJson?.result) setResult(rJson.result);
      }
    }
    load().catch(() => {
      if (!cancelled) setError("Could not load the assessment.");
    });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  async function refreshResult(): Promise<boolean> {
    const rRes = await fetch(`/api/attempts/${attemptId}/result`);
    const rJson = (await rRes.json().catch(() => null)) as { result?: ResultData } | null;
    if (rRes.ok && rJson?.result) {
      setResult(rJson.result);
      return true;
    }
    return false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, answerText]) => ({ questionId, answerText })),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not submit the assessment.");
        setPending(false);
        return;
      }
      await refreshResult();
    } catch {
      setError("Could not submit the assessment.");
    }
    setPending(false);
  }

  async function complete() {
    setError(null);
    setCompleting(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/complete`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        attempt?: AttemptState;
        completed?: boolean;
        error?: string;
        remaining?: { steps: number; observations: number; assessment: boolean };
      } | null;
      if (!res.ok || !data?.attempt) {
        setError(data?.error ?? "Could not complete the experiment.");
        // Guide the student back: jump to the first step that still needs work.
        if (res.status === 422 && data?.remaining && (data.remaining.observations > 0 || data.remaining.steps > 0)) {
          onBlocked();
        }
        setCompleting(false);
        return;
      }
      onCompleted(data.attempt);
      await refreshResult();
    } catch {
      setError("Could not complete the experiment.");
    }
    setCompleting(false);
  }

  if (error && !assessment && !result) {
    return (
      <p role="alert" className="text-sm text-error">
        {error}
      </p>
    );
  }
  if (!assessment) {
    return <p className="text-sm text-ink-2">Loading assessment…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <section aria-label="Assessment result">
          <ResultView result={result} />
          {result.status !== "COMPLETED" ? (
            <button
              type="button"
              onClick={complete}
              disabled={completing}
              className="mt-6 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
            >
              {completing ? "Completing…" : "Complete experiment →"}
            </button>
          ) : null}
        </section>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-ink-3">ASSESSMENT</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">{assessment.title}</h3>
            <p className="mt-1 text-sm text-ink-2">{assessment.instructions}</p>
          </div>
          {assessment.questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend className="text-sm font-medium">
                <span className="mr-2 font-mono text-xs text-ink-3">{i + 1}</span>
                {q.questionText}
              </legend>
              {q.type === "MULTIPLE_CHOICE" && q.options ? (
                <div className="mt-2 flex flex-col gap-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-raised"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className="mt-0.5 accent-[#20C9C3]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <label className="mt-2 block">
                  <span className="sr-only">{q.questionText}</span>
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm"
                  />
                </label>
              )}
            </fieldset>
          ))}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit assessment"}
          </button>
        </form>
      )}
    </div>
  );
}
