"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ObservationDraft = { prompt: string; required: boolean };
type StepDraft = { title: string; instructions: string; observations: ObservationDraft[] };
type QuestionDraft = {
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  questionText: string;
  options: string[];
  expectedAnswer: string;
};

const inputClass = "rounded-lg border border-line bg-transparent px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm font-medium";

/** Teacher experiment creator: one complete package, published on save (FR-TEA-31). */
export function ExperimentCreator() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [materials, setMaterials] = useState("");
  const [safety, setSafety] = useState("");
  const [duration, setDuration] = useState("45");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [topic, setTopic] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([{ title: "", instructions: "", observations: [] }]);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentInstructions, setAssessmentInstructions] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { type: "MULTIPLE_CHOICE", questionText: "", options: ["", ""], expectedAnswer: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function patchStep(i: number, patch: Partial<StepDraft>) {
    setSteps((s) => s.map((step, j) => (j === i ? { ...step, ...patch } : step)));
  }
  function patchQuestion(i: number, patch: Partial<QuestionDraft>) {
    setQuestions((q) => q.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          objectives,
          materials,
          safety,
          durationMinutes: Number(duration),
          difficulty,
          topic,
          steps,
          assessment: { title: assessmentTitle, instructions: assessmentInstructions, questions },
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        experiment?: { experimentId: string };
        error?: string;
      } | null;
      if (!res.ok || !data?.experiment) {
        setError(data?.error ?? "Could not create the experiment.");
        setPending(false);
        return;
      }
      router.push(`/dashboard/teacher/experiments/${data.experiment.experimentId}`);
    } catch {
      setError("Could not create the experiment.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-8">
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="basics" className="flex flex-col gap-3">
        <h2 id="basics" className="text-xs font-semibold tracking-[0.15em] text-ink-3">BASICS</h2>
        <label className={labelClass}>Title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className={inputClass} /></label>
        <label className={labelClass}>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={2} className={inputClass} /></label>
        <label className={labelClass}>Learning objectives (one per line)<textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} required rows={3} className={inputClass} /></label>
        <label className={labelClass}>Materials (one per line)<textarea value={materials} onChange={(e) => setMaterials(e.target.value)} required rows={3} className={inputClass} /></label>
        <label className={labelClass}>Safety instructions<textarea value={safety} onChange={(e) => setSafety(e.target.value)} required rows={3} className={inputClass} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>Duration (min)<input type="number" min={1} max={480} value={duration} onChange={(e) => setDuration(e.target.value)} required className={inputClass} /></label>
          <label className={labelClass}>Difficulty<input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required maxLength={50} className={inputClass} /></label>
          <label className={labelClass}>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} required maxLength={100} placeholder="e.g. Physics" className={inputClass} /></label>
        </div>
      </section>

      <section aria-labelledby="steps" className="flex flex-col gap-4">
        <h2 id="steps" className="text-xs font-semibold tracking-[0.15em] text-ink-3">STEPS ({steps.length})</h2>
        {steps.map((s, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface px-4 py-3">
            <p className="font-mono text-xs text-ink-3">STEP {i + 1}</p>
            <div className="mt-2 flex flex-col gap-3">
              <label className={labelClass}>Title<input value={s.title} onChange={(e) => patchStep(i, { title: e.target.value })} required maxLength={200} className={inputClass} /></label>
              <label className={labelClass}>Instructions<textarea value={s.instructions} onChange={(e) => patchStep(i, { instructions: e.target.value })} required rows={3} className={inputClass} /></label>
              <div>
                <p className="text-sm font-medium">Observations ({s.observations.length})</p>
                {s.observations.map((o, k) => (
                  <div key={k} className="mt-2 flex flex-col gap-2 rounded-lg border border-line px-3 py-2">
                    <label className={labelClass}>Prompt<input value={o.prompt} onChange={(e) => {
                      const observations = s.observations.map((x, j) => (j === k ? { ...x, prompt: e.target.value } : x));
                      patchStep(i, { observations });
                    }} required maxLength={1000} className={inputClass} /></label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={o.required}
                        onChange={(e) => {
                          const observations = s.observations.map((x, j) => (j === k ? { ...x, required: e.target.checked } : x));
                          patchStep(i, { observations });
                        }}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => patchStep(i, { observations: s.observations.filter((_, j) => j !== k) })}
                      className="self-start text-[13px] font-medium text-error"
                    >
                      Remove observation
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => patchStep(i, { observations: [...s.observations, { prompt: "", required: true }] })}
                  className="mt-2 text-[13px] font-medium text-[#5dcaa5]"
                >
                  + Add observation
                </button>
              </div>
              {steps.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
                  className="self-start text-[13px] font-medium text-error"
                >
                  Remove step
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSteps((s) => [...s, { title: "", instructions: "", observations: [] }])}
          className="self-start rounded-lg border border-line px-4 py-2 text-sm font-medium"
        >
          + Add step
        </button>
      </section>

      <section aria-labelledby="assessment" className="flex flex-col gap-4">
        <h2 id="assessment" className="text-xs font-semibold tracking-[0.15em] text-ink-3">ASSESSMENT</h2>
        <label className={labelClass}>Title<input value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} required maxLength={200} className={inputClass} /></label>
        <label className={labelClass}>Instructions<textarea value={assessmentInstructions} onChange={(e) => setAssessmentInstructions(e.target.value)} required rows={2} className={inputClass} /></label>
        {questions.map((q, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface px-4 py-3">
            <p className="font-mono text-xs text-ink-3">QUESTION {i + 1}</p>
            <div className="mt-2 flex flex-col gap-3">
              <label className={labelClass}>Type
                <select value={q.type} onChange={(e) => patchQuestion(i, { type: e.target.value as QuestionDraft["type"] })} className={inputClass}>
                  <option value="MULTIPLE_CHOICE">Multiple choice</option>
                  <option value="SHORT_ANSWER">Short answer</option>
                </select>
              </label>
              <label className={labelClass}>Question<textarea value={q.questionText} onChange={(e) => patchQuestion(i, { questionText: e.target.value })} required rows={2} maxLength={2000} className={inputClass} /></label>
              {q.type === "MULTIPLE_CHOICE" ? (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.expectedAnswer === opt && opt !== ""}
                        onChange={() => patchQuestion(i, { expectedAnswer: opt })}
                        aria-label={`Mark option ${k + 1} correct`}
                      />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const options = q.options.map((x, j) => (j === k ? e.target.value : x));
                          patchQuestion(i, {
                            options,
                            expectedAnswer: q.expectedAnswer === opt ? e.target.value : q.expectedAnswer,
                          });
                        }}
                        required
                        maxLength={500}
                        placeholder={`Option ${k + 1}`}
                        className={`${inputClass} flex-1`}
                      />
                      {q.options.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => patchQuestion(i, { options: q.options.filter((_, j) => j !== k) })}
                          aria-label={`Remove option ${k + 1}`}
                          className="text-sm text-error"
                        >
                          ✕
                        </button>
                      ) : null}
                    </label>
                  ))}
                  {q.options.length < 6 ? (
                    <button
                      type="button"
                      onClick={() => patchQuestion(i, { options: [...q.options, ""] })}
                      className="self-start text-[13px] font-medium text-[#5dcaa5]"
                    >
                      + Add option
                    </button>
                  ) : null}
                  <p className="text-xs text-ink-3">Select the radio of the correct option.</p>
                </div>
              ) : (
                <label className={labelClass}>Expected answer (used for grading)<textarea value={q.expectedAnswer} onChange={(e) => patchQuestion(i, { expectedAnswer: e.target.value })} required rows={2} maxLength={2000} className={inputClass} /></label>
              )}
              {questions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((_, j) => j !== i))}
                  className="self-start text-[13px] font-medium text-error"
                >
                  Remove question
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setQuestions((q) => [...q, { type: "MULTIPLE_CHOICE", questionText: "", options: ["", ""], expectedAnswer: "" }])}
          className="self-start rounded-lg border border-line px-4 py-2 text-sm font-medium"
        >
          + Add question
        </button>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish experiment"}
      </button>
    </form>
  );
}
