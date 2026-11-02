"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/shared/controls";
import { allSame, netWords } from "@/lib/farm/quickPicks";
import type { Change } from "@/lib/farm/score";
import type { Confidence } from "@/lib/farm/types";

export interface SheetAlt { label: string; net: Change; moreDanger: boolean; flag?: Confidence }

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const flagText = (f?: Confidence) => (f === "single" ? " (single source)" : f === "unverified" ? " (unverified)" : "");

/**
 * Keep or swap one mod. A native modal <dialog>: a bottom sheet up to 720 px, a popover anchored to the chip above that.
 * Escape and Close dismiss it; Tab stays inside; the caller returns focus to the chip.
 */
export function ModSheet({
  anchor,
  title,
  where,
  flag,
  alts,
  onApply,
  onClose,
}: {
  /** Selector of the chip that opened the sheet (the popover sits next to it). */
  anchor: string;
  title: string;
  where: string;
  flag?: Confidence;
  alts: SheetAlt[];
  onApply: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const chip = document.querySelector<HTMLElement>(anchor);
    if (!dlg.open) dlg.showModal();
    if (window.matchMedia("(min-width: 721px)").matches && chip) {
      const r = chip.getBoundingClientRect();
      const h = dlg.offsetHeight;
      const w = dlg.offsetWidth;
      const gap = 8;
      let top = r.bottom + gap;
      if (top + h > window.innerHeight - gap) top = Math.max(gap, r.top - gap - h);
      const left = Math.min(Math.max(gap, r.left), window.innerWidth - w - gap);
      dlg.style.setProperty("--qp-top", `${top}px`);
      dlg.style.setProperty("--qp-left", `${left}px`);
    }
    dlg.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      if (dlg.open) dlg.close();
    };
  }, [anchor]);

  const trap = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={ref}
      className="qp-sheet"
      aria-labelledby="qp-sheet-title"
      data-testid="qp-sheet"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={trap}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="qp-sheet-body">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="label-metric">{where}</p>
            <h4 id="qp-sheet-title" className="title-sentence qp-sheet-title">
              {title}
              {flagText(flag)}
            </h4>
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
        <p className="qp-body text-ink-dim">Keep this mod, or apply one of the best other mods for this spot. The change is to Net.</p>
        <ul className="qp-alts">
          <li>
            <span className="qp-alt-name">Keep {title}</span>
            <span className="qp-alt-delta">Current</span>
            <Button data-autofocus onClick={onClose}>Keep</Button>
          </li>
          {alts.map((a, i) => {
            const w = netWords(a.net);
            return (
              <li key={`${i}${a.label}`} data-testid="qp-alt">
                <span className="qp-alt-name">
                  {a.label}
                  {flagText(a.flag)}
                </span>
                <span className="qp-alt-delta" data-tone={w.sign > 0 ? "good" : w.sign < 0 ? "danger" : undefined}>
                  {w.marker ? <span aria-hidden="true">{w.marker} </span> : null}
                  {w.text}
                  {a.moreDanger ? <span className="qp-more-danger"> · more danger</span> : null}
                </span>
                <Button variant="primary" aria-label={`Apply ${a.label}`} onClick={() => onApply(i)}>Apply</Button>
              </li>
            );
          })}
        </ul>
        {alts.length === 0 ? <p className="text-sm text-ink-mute">No other mod can go in this spot.</p> : null}
        {allSame(alts) ? <p className="text-sm text-ink-mute">This farm&rsquo;s score does not count this spot, so these swaps leave Net the same.</p> : null}
      </div>
    </dialog>
  );
}
