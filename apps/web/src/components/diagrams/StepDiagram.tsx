"use client";

/**
 * Diagram slot for a roadmap step (V1), keyed by `RoadmapStep.diagram`. The SVG chunk loads only when the slot nears
 * the viewport: a closed <details> has no layout, so the observer stays quiet until the step is opened and scrolled
 * to. The box reserves the diagram's aspect ratio, so mounting it doesn't shift the page, and the `aria-label` carries
 * the same meaning as the picture whether or not it has mounted yet.
 */

import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import type { RoadmapStep } from "@/lib/types";

type DiagramKind = NonNullable<RoadmapStep["diagram"]>;

const DIAGRAMS: Record<DiagramKind, { label: string; ratio: string; Svg: ComponentType }> = {
  "waystone-ladder": {
    label:
      "Waystone tier ladder, three ways up a tier: reforge three Waystones of one tier into one of the next tier; run a Powerful Map Boss, which drops a Waystone one tier higher; or buy from Doryani, who sells one tier below your best completed.",
    ratio: "300 / 220",
    Svg: lazy(() => import("./WaystoneLadder")),
  },
  "atlas-path": {
    label:
      "Route to the Arbiter of Ash: from your start, about three maps to the nearest Precursor Tower, which reveals the Fortress; then the Ancient Gateway, where maps start giving Atlas points; then the Burning Monolith, home of the Arbiter of Ash. Route through Powerful Map Boss nodes and take the trial-key node just off the path.",
    ratio: "300 / 220",
    Svg: lazy(() => import("./AtlasPath")),
  },
  "boss-order": {
    label:
      "Kill in this order: 1, Arbiter of Ash, weak to cold and resists fire, unlocks 3-modifier tablets. 2, the quest Arbiter of Divinity, weak to fire and resists lightning, opens the top of the Atlas tree. 3, the non-quest Arbiter of Divinity, unlocks the full Atlas.",
    ratio: "300 / 200",
    Svg: lazy(() => import("./BossOrder")),
  },
};

export function StepDiagram({ kind }: { kind: DiagramKind }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const { label, ratio, Svg } = DIAGRAMS[kind];

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <figure
      ref={ref}
      role="img"
      aria-label={label}
      data-diagram={kind}
      className="w-full border border-line p-2"
      style={{ maxWidth: 420 }}
    >
      <div style={{ aspectRatio: ratio }}>
        {shown ? (
          <Suspense fallback={null}>
            <Svg />
          </Suspense>
        ) : null}
      </div>
    </figure>
  );
}
