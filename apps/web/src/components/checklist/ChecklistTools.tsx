"use client";

/**
 * The Waystone planner and the readiness check. Side by side on a wide
 * screen; on a phone, one at a time behind a two-button switcher, so the
 * checklist itself starts a screen sooner.
 */

import { useState } from "react";
import { ReadinessPanel } from "./ReadinessPanel";
import { WaystonePlanner } from "./WaystonePlanner";
import { Segmented } from "@/components/shared/controls";

type Tool = "waystones" | "ready";
const TOOLS = [
  { value: "waystones", label: "Waystone planner" },
  { value: "ready", label: "Am I ready?" },
] as const satisfies readonly { value: Tool; label: string }[];

export function ChecklistTools() {
  const [tool, setTool] = useState<Tool>("waystones");
  return (
    <div>
      <Segmented
        kind="tabs"
        label="Planning tools"
        options={TOOLS}
        value={tool}
        onChange={setTool}
        className="mb-2 lg:hidden"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tool === "waystones" ? "" : "hidden lg:block"}>
          <WaystonePlanner />
        </div>
        <div className={tool === "ready" ? "" : "hidden lg:block"}>
          <ReadinessPanel />
        </div>
      </div>
    </div>
  );
}
