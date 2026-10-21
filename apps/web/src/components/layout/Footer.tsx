"use client";

import { useRef } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useResetProgress } from "@/hooks/useResetProgress";

export function Footer() {
  const resetProgress = useResetProgress();
  const { state } = usePersistedState();
  const dialog = useRef<HTMLDialogElement>(null);
  const steps = state.checklist.completedStepIds.length;

  return (
    <footer className="border-t border-line py-6 text-xs text-ink-mute">
      <div className="shell flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p>
          Unofficial fan project — not affiliated with or endorsed by Grinding
          Gear Games. MIT licensed.
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="hit-area hover:text-danger"
          >
            Reset all progress
          </button>
        </div>
      </div>

      {/* In-page confirm. Esc and "Keep progress" both leave progress untouched. */}
      <dialog ref={dialog} className="confirm" aria-labelledby="reset-title" aria-describedby="reset-body">
        <h2 id="reset-title" className="text-base">
          Reset all progress?
        </h2>
        <p id="reset-body" className="mt-3 text-sm text-ink-dim">
          This will clear{" "}
          <strong className="tabular text-ink">
            {steps} completed {steps === 1 ? "step" : "steps"}
          </strong>
          , your ticked sub-steps, Atlas allocation and dashboard selections in this browser. It can&apos;t be undone.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="gold-surface rounded-md border border-[var(--accent)] px-4 py-1.5 text-sm font-bold hover:brightness-110"
          >
            Keep progress
          </button>
          <button
            type="button"
            onClick={() => {
              resetProgress();
              dialog.current?.close();
            }}
            className="rounded-md border border-danger px-4 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Reset progress
          </button>
        </div>
      </dialog>
    </footer>
  );
}
