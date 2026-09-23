"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { NavLink } from "@/app/NavLink";
import { AuthLayout } from "../auth/AuthLayout";
import { PasswordInput } from "../auth/PasswordInput";

function ResetForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Request failed. Please try again.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">New password</label>
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
        <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
        <PasswordInput
          id="confirm-password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
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
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout heading="Choose a new password" subheading="Your reset link works once and expires after an hour.">
      <Suspense>
        <ResetFormWithToken />
      </Suspense>
      <p className="mt-4 text-sm text-ink-2">
        <NavLink href="/login" arrow="back">Back to log in</NavLink>
      </p>
    </AuthLayout>
  );
}

function ResetFormWithToken() {
  const params = useSearchParams();
  return <ResetForm token={params.get("token")} />;
}
