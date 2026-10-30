"use client";

import { useRef } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useResetProgress } from "@/hooks/useResetProgress";
import { SkyDimToggle } from "@/components/fx/SkySettings";
import { Button } from "@/components/shared/controls";

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
        <div className="flex flex-wrap items-center justify-center gap-4">
          <SkyDimToggle />
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
          <Button variant="primary" onClick={() => dialog.current?.close()}>
            Keep progress
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetProgress();
              dialog.current?.close();
            }}
          >
            Reset progress
          </Button>
        </div>
      </dialog>
    </footer>
  );
}
