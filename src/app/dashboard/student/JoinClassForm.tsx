"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <form onSubmit={onSubmit} className={`flex ${compact ? "" : "mt-3 max-w-[520px] "}flex-col gap-3`}>
      <div className="flex flex-col gap-1">
        <label htmlFor={compact ? "class-code-inline" : "class-code"} className="text-sm font-medium">Class code</label>
        <input
          id={compact ? "class-code-inline" : "class-code"}
          name="code"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. K7Q2MD"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="rounded-lg border border-line bg-transparent px-3 py-2 font-mono uppercase"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        {pending ? "Joining…" : "Join class"}
      </button>
    </form>
  );
}
