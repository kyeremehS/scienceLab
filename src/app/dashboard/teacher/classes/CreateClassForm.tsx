"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = (await res.json()) as { class?: { id: string }; error?: string };
      if (!res.ok || !data.class) {
        setError(data.error ?? "Could not create the class.");
        return;
      }
      setName("");
      setDescription("");
      router.push(`/dashboard/teacher/classes/${data.class.id}`);
      router.refresh();
    } catch {
      setError("Could not create the class.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="class-name" className="text-sm font-medium">Class name</label>
        <input
          id="class-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-line bg-transparent px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="class-description" className="text-sm font-medium">
          Description <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <input
          id="class-description"
          name="description"
          type="text"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-line bg-transparent px-3 py-2"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50 sm:w-auto sm:self-end"
      >
        Create class →
      </button>
    </form>
  );
}
