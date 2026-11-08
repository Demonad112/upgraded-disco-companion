"use client";

import type { ReactNode } from "react";
import { usePrefs } from "@/hooks/usePrefs";

/** The one "Pro detail" switch (checklist, Atlas and dashboard headers). Stored in the `proDetail` pref. */
export function ProToggle({ className = "" }: { className?: string }) {
  const { proDetail, setProDetail } = usePrefs();
  return (
    <button
      type="button"
      aria-pressed={proDetail}
      onClick={() => setProDetail(!proDetail)}
      className={`hit-area inline-flex items-center gap-2 border px-2.5 py-1 text-xs ${
        proDetail ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-dim hover:border-line-strong"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`inline-block size-2.5 border ${proDetail ? "border-accent bg-accent" : "border-ink-mute"}`}
      />
      Pro detail
    </button>
  );
}

/** The short caddy line by default, the full text under Pro detail. Takes strings, so server components can use it. */
export function ProSwap({ short, long }: { short: string; long?: string }) {
  const { proDetail } = usePrefs();
  return <>{proDetail && long ? long : short}</>;
}

/** Renders its children only while Pro detail is on. */
export function ProOnly({ children }: { children: ReactNode }) {
  const { proDetail } = usePrefs();
  return proDetail ? <>{children}</> : null;
}
