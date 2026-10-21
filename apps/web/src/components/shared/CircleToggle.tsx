import type { ReactNode } from "react";

/**
 * A round checklist marker that is a real button: `aria-pressed` carries the
 * state, the label names it. With `children` the whole row is the target (an
 * action item); without, only the circle is (a step, where the title is a
 * separate <summary>).
 */
export function CircleToggle({
  done,
  onToggle,
  label,
  children,
  className = "",
}: {
  done: boolean;
  onToggle: () => void;
  /** Accessible name when there are no children. */
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-compact-ok
      aria-pressed={done}
      aria-label={children ? undefined : label}
      onClick={onToggle}
      className={`${children ? "flex items-start gap-2 text-left" : "hit-area inline-grid"} ${className}`}
    >
      <span className="mark" aria-hidden />
      {children}
    </button>
  );
}
