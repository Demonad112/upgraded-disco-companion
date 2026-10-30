"use client";

import { OPEN_PATCH_MENU_EVENT } from "./NavMenu";

/** Phones: the short patch notice's ⓘ opens the Patch menu, which holds the full note. */
export function BannerInfo() {
  return (
    <button
      type="button"
      aria-label="About patch data"
      onClick={() => window.dispatchEvent(new Event(OPEN_PATCH_MENU_EVENT))}
      className="hit-area px-0.5 leading-none text-accent hover:text-ink"
    >
      ⓘ
    </button>
  );
}
