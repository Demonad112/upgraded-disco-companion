"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/shared/controls";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  MAX_IMPORT_BYTES,
  applyImport,
  buildExport,
  exportFileName,
  parseImport,
  type ProgressData,
} from "@/lib/progressTransfer";

/**
 * Save progress to a JSON file and load it back, so it survives a cleared browser or
 * moves to another device. Lives on the Checklist, where the progress is ticked off.
 * Nothing is written until a file passes validation and the player picks Merge or Replace.
 */
export function ProgressTransfer() {
  const { state, setState } = usePersistedState();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<ProgressData | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(buildExport(state), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName();
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: "ok", text: "Progress saved to a file." });
  };

  const onFile = async (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({ kind: "error", text: "File is too large to be a progress export." });
      return;
    }
    const result = parseImport(await file.text());
    if (!result.ok) {
      setMessage({ kind: "error", text: `Nothing was changed. ${result.error}` });
      return;
    }
    setMessage(null);
    setPending(result.data);
    dialog.current?.showModal();
  };

  const apply = (mode: "merge" | "replace") => {
    if (pending) setState((prev) => applyImport(prev, pending, mode));
    setPending(null);
    dialog.current?.close();
    setMessage({ kind: "ok", text: mode === "merge" ? "Progress merged." : "Progress replaced." });
  };

  const cancel = () => {
    setPending(null);
    dialog.current?.close();
  };

  return (
    <div data-surface="data" className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <h2 className="label-field">Back up progress</h2>
        <p className="mt-1 text-sm text-ink-dim">Save your checklist, Atlas and farm progress to a file, or load one.</p>
        <p role="status" className={`mt-1 text-sm ${message?.kind === "error" ? "text-danger" : "text-ink-dim"}`}>
          {message?.text}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportFile}>Export file</Button>
        <Button onClick={() => input.current?.click()}>Import file</Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Progress file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>

      <dialog
        ref={dialog}
        className="confirm"
        aria-labelledby="import-title"
        aria-describedby="import-body"
        onClose={() => setPending(null)}
      >
        <h2 id="import-title" className="text-base">
          Import progress?
        </h2>
        <p id="import-body" className="mt-3 text-sm text-ink-dim">
          <strong className="text-ink">Merge</strong> keeps what you have ticked and adds the file&apos;s.{" "}
          <strong className="text-ink">Replace</strong> makes your checklist, Atlas and farm progress match the file. Your
          character history is not touched.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button onClick={cancel}>Cancel</Button>
          <Button variant="danger" onClick={() => apply("replace")}>
            Replace
          </Button>
          <Button variant="primary" onClick={() => apply("merge")}>
            Merge
          </Button>
        </div>
      </dialog>
    </div>
  );
}
