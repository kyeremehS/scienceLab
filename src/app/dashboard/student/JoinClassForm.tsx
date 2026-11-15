"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Join a class with a six-letter code. `compact` is the inline/dialog form
 * (visible label, mono placeholder, neutral button); the dashboard card uses
 * the spec panel form (pp.6–7): visually hidden label, sentence-case
 * placeholder, full-width orange action.
 */
export function JoinClassForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { membership?: unknown; error?: string };
      if (!res.ok || !data.membership) {
        setError(data.error ?? "Could not join the class.");
        return;
      }
      setCode("");
      router.refresh();
    } catch {
      setError("Could not join the class.");
    } finally {
      setPending(false);
    }
  }

  const id = compact ? "class-code-inline" : "class-code";

  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col gap-3 ${compact ? "" : "mt-4"}`}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className={compact ? "text-sm font-medium" : "sr-only"}>
          Class code
        </label>
        <input
          id={id}
          name="code"
          type="text"
          required
          autoComplete="off"
          placeholder={compact ? "e.g. k7q2md" : "Enter class code"}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className={
            compact
              ? "rounded-lg border border-line bg-transparent px-3 py-2 font-mono uppercase"
              : "rounded-lg border border-line bg-transparent px-4 py-3 text-[15px] font-mono placeholder:font-sans placeholder:text-ink-3"
          }
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`w-full rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50 ${
          compact
            ? "bg-orange text-white transition-colors duration-150 hover:bg-orange-hover"
            : "bg-orange py-3 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-orange-hover"
        }`}
      >
        {compact ? "Join class" : "Join"}
      </button>
    </form>
  );
}
