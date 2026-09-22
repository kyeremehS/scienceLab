"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ ghost = false }: { ghost?: boolean }) {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        ghost
          ? "w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink-2 transition-colors hover:bg-raised hover:text-error"
          : "rounded-lg border border-solid border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-raised"
      }
    >
      Log out
    </button>
  );
}
