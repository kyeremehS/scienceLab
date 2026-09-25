"use client";

import { useState } from "react";

/** Authenticated password change (FR-AUTH-03). */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not change the password.");
        setPending(false);
        return;
      }
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not change the password.");
    }
    setPending(false);
  }

  if (done) {
    return <p role="status" className="text-sm text-ink-2">Password changed.</p>;
  }
  return (
    <form onSubmit={onSubmit} className="flex max-w-[520px] flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="current-password" className="text-sm font-medium">Current password</label>
        <input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-lg border border-line bg-transparent px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-password" className="text-sm font-medium">New password</label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-lg border border-line bg-transparent px-3 py-2"
        />
        <p className="text-xs text-ink-3">At least 8 characters.</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-lg border border-line bg-transparent px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        Change password
      </button>
    </form>
  );
}
