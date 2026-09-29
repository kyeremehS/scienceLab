"use client";

import { useEffect, useRef, useState } from "react";
import { JoinClassForm } from "../JoinClassForm";

/** Collapsed join trigger opening a dialog, so the form never competes with the list. */
export function JoinClassDialog() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open ]);

  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-[#6366F1]"
      >
        + Join a class
      </button>
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        onClose={() => setOpen(false)}
        aria-labelledby="join-dialog-title"
        className="w-[min(92vw,420px)] rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-black/50"
      >
        <h2 id="join-dialog-title" className="font-display text-lg font-semibold tracking-tight">
          Join with a code
        </h2>
        <p className="mt-1 text-sm text-ink-2">Paste the class code shared by your teacher.</p>
        <div className="mt-4">
          <JoinClassForm compact />
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 text-sm font-medium text-ink-3 underline underline-offset-4"
        >
          Cancel
        </button>
      </dialog>
    </>
  );
}
