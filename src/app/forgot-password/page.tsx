"use client";

import { useState } from "react";
import { NavLink } from "@/app/NavLink";
import { AuthLayout } from "../auth/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed. Please try again.");
        return;
      }
      setMessage(data.message ?? "If an account exists for this email, we've sent a password reset link.");
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout heading="Reset your password" subheading="Enter your account email to receive a reset link.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
        {message ? (
          <p role="status" className="text-sm text-ink-2">{message}</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-error">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-2">
        Remembered it? <NavLink href="/login">Log in</NavLink>
      </p>
    </AuthLayout>
  );
}
