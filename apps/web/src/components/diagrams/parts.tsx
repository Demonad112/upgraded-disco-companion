/**
 * Shared SVG pieces for the step diagrams (V1): gold hairlines, square nodes and uppercase EB Garamond labels.
 * Colours are :root tokens set as inline `var()` styles, never hex. Inline rather than Tailwind fill-/stroke- utilities
 * on purpose: utilities land in the global stylesheet every route loads, inline styles stay in the lazy SVG chunks.
 * Drawn for a 300-unit-wide viewBox, so at a 360 px phone one unit is about one pixel and 9–10-unit text stays legible.
 */

import type { ReactNode } from "react";

/** Token colours the diagrams use. */
export const ink = {
  ink: "var(--ink)",
  mute: "var(--ink-mute)",
  accent: "var(--accent)",
  accentLine: "var(--accent-line)",
  line: "var(--line-strong)",
  danger: "var(--danger)",
  surface: "var(--surface)",
  cold: "var(--dmg-cold)",
  fire: "var(--dmg-fire)",
} as const;

/** Uppercase heading-face label. Strings are written in capitals so the meaning doesn't depend on CSS. */
export function Label({
  x,
  y,
  children,
  anchor = "start",
  size = 11,
  tone = "ink",
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  size?: number;
  tone?: "ink" | "mute" | "accent";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      style={{ fill: ink[tone], fontFamily: "var(--font-heading)", letterSpacing: "var(--heading-tracking)" }}
    >
      {children}
    </text>
  );
}

/** Square box with its top-left at (x, y). */
export function Box({
  x,
  y,
  w,
  h,
  tone = "accent",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: "accent" | "line" | "danger";
}) {
  return (
    <rect x={x} y={y} width={w} height={h} strokeWidth={1} style={{ fill: ink.surface, stroke: ink[tone] }} />
  );
}

/** Square node centred on (cx, cy). */
export function Node({
  cx,
  cy,
  size = 22,
  tone = "accent",
  children,
}: {
  cx: number;
  cy: number;
  size?: number;
  tone?: "accent" | "line" | "danger";
  children?: ReactNode;
}) {
  return (
    <g>
      <Box x={cx - size / 2} y={cy - size / 2} w={size} h={size} tone={tone} />
      {children}
    </g>
  );
}

/** Arrowhead marker; each diagram gives it its own id so several diagrams on one page don't share one. */
export function ArrowDef({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0L8 4L0 8z" style={{ fill: ink.accent }} />
      </marker>
    </defs>
  );
}

/** Gold hairline, optionally ending in the diagram's arrowhead. */
export function Line({ d, arrow, dashed }: { d: string; arrow?: string; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      strokeWidth={1}
      strokeDasharray={dashed ? "3 3" : undefined}
      markerEnd={arrow ? `url(#${arrow})` : undefined}
      style={{ stroke: ink.accentLine }}
    />
  );
}
