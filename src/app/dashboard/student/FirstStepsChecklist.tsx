"use client";

import { useState } from "react";
import { JoinClassForm } from "./JoinClassForm";

/**
 * First-steps checklist. The join step expands the code form inline so the
 * action lives where the intent is expressed.
 */
export function FirstStepsChecklist({ joinedClass }: { joinedClass: boolean }) {
  const [joinOpen, setJoinOpen] = useState(false);

  const steps = [
    { label: "Join a class with your teacher's code", done: joinedClass, expandable: !joinedClass },
    { label: "Start your first experiment", done: false, expandable: false },
    { label: "Record your first observation", done: false, expandable: false },
    { label: "Complete your first assessment", done: false, expandable: false },
  ];

  return (
    <ul className="flex flex-col gap-1">
      {steps.map((s) => (
        <li key={s.label}>
          {s.expandable ? (
            <div>
              <button
                type="button"
                onClick={() => setJoinOpen((v) => !v)}
                aria-expanded={joinOpen}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-raised"
              >
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-xs text-transparent"
                >
                  ✓
                </span>
                <span className="flex-1 text-ink-2">{s.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink-3">
                  <path d={joinOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                </svg>
              </button>
              {joinOpen ? (
                <div className="pb-2 pl-9 pr-2">
                  <JoinClassForm compact />
                </div>
              ) : null}
            </div>
          ) : (
            <span className="flex items-center gap-3 px-2 py-1.5 text-sm">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                  s.done ? "border-accent bg-accent text-[#083f3c]" : "border-line text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={s.done ? "text-ink" : "text-ink-2"}>{s.label}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
