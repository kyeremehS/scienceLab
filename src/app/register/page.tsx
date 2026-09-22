"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "../auth/AuthLayout";
import { PasswordInput } from "../auth/PasswordInput";

type RoleChoice = "STUDENT" | "TEACHER";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<RoleChoice>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      // Client-side convenience only; the server validates the real password.
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      // Role travels in the URL (server-controlled), never trusted from the body.
      const endpoint =
        role === "TEACHER" ? "/api/auth/register/teacher" : "/api/auth/register/student";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { user?: { role: string }; error?: string };
      if (!res.ok || !data.user) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      router.push(data.user.role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student");
      router.refresh();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout heading="Create your account" subheading="Start learning science by doing.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-transparent px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-transparent px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            describedBy="password-helper"
            value={password}
            onChange={setPassword}
          />
          <p id="password-helper" className="text-xs text-ink-3">At least 8 characters.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</label>
          <PasswordInput
            id="confirm-password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </div>
        <fieldset>
          <legend className="sr-only">I am a…</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(
              [
                { value: "STUDENT", title: "Student", hint: "Perform experiments" },
                { value: "TEACHER", title: "Teacher", hint: "Manage classes" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="cursor-pointer rounded-lg border border-line px-3 py-2.5 text-sm transition-colors has-checked:border-accent has-checked:bg-accent/[0.05]"
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <span className="flex items-center gap-2 font-medium">
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 items-center justify-center rounded-full border border-current"
                  >
                    {role === option.value ? (
                      <span className="h-2 w-2 rounded-full bg-current" />
                    ) : null}
                  </span>
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs text-ink-3">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-error">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-2">
        Already have an account? <Link href="/login" className="font-medium text-accent-ink underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
