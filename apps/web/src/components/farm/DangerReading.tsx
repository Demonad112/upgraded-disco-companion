"use client";

import { farmData as d } from "@/data/farm";
import { ProOnly } from "@/components/shared/ProToggle";
import { dangerReading } from "@/lib/farm/score";
import type { Loadout } from "@/lib/farm/types";

/** Danger as a word (Low / Medium / High, or "No danger mods"), with the Pro note that it is rated, not measured. */
export function DangerReading({ loadout, danger, big }: { loadout: Loadout; danger: number; big?: boolean }) {
  const r = dangerReading(d, loadout, danger);
  return (
    <>
      <span className={big ? "farm-num qp-big" : "farm-num"} data-testid="danger-band" data-band={r.band ?? "none"}>
        {r.label}
      </span>
      <ProOnly>
        <span className="farm-since" data-testid="danger-note"> Rated from mod type, not measured.</span>
      </ProOnly>
    </>
  );
}
