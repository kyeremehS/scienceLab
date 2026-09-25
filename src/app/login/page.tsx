"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NavLink } from "@/app/NavLink";
import { AuthLayout } from "../auth/AuthLayout";
import { PasswordInput } from "../auth/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { user?: { role: string }; error?: string };
      if (!res.ok || !data.user) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }
      router.push(data.user.role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student");
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout heading="Welcome back" subheading="Sign in to continue learning.">
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
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
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
          Sign in
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-2">
        <NavLink href="/forgot-password">Forgot password?</NavLink>
      </p>
      <p className="mt-2 text-sm text-ink-2">
        No account yet? <NavLink href="/register">Register</NavLink>
      </p>
    </AuthLayout>
  );
}
