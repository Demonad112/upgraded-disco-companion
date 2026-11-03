"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { HomeStart } from "@/lib/types";
import { usePrefs } from "@/hooks/usePrefs";
import { usePersistedState } from "@/hooks/usePersistedState";

export interface StartTile {
  id: HomeStart;
  label: string;
  href: string;
  icon: ReactNode;
}

/**
 * Where to start (H1). Until a choice is stored in `homeStart` it shows three
 * square tiles; after that the chosen tile leads with a "Change" control
 * beside it, in the same row height so returning visits don't shift the page.
 */
export function StartPicker({ tiles }: { tiles: StartTile[] }) {
  const { homeStart, setHomeStart } = usePrefs();
  const { state } = usePersistedState();
  const [open, setOpen] = useState(false);
  // Farming reopens the last farm (FP1 deep link) when there is one.
  const farm = state.farm?.current;
  const href = (t: StartTile) => (t.id === "farming" && farm ? `/dashboard#farm-${farm}` : t.href);
  const chosen = !open && tiles.find((t) => t.id === homeStart);

  const tile = (t: StartTile) => (
    <Link
      key={t.id}
      href={href(t)}
      onClick={() => setHomeStart(t.id)}
      className="card start-tile"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" aria-hidden>
        {t.icon}
      </svg>
      <span>{t.label}</span>
    </Link>
  );

  return (
    <nav aria-label="Start with" className="start-picker">
      {chosen ? (
        <>
          {tile(chosen)}
          <button type="button" className="card start-change" onClick={() => setOpen(true)}>
            Change
          </button>
        </>
      ) : (
        tiles.map(tile)
      )}
    </nav>
  );
}
