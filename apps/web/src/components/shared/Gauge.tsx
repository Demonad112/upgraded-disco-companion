import { gaugeModel } from "@/lib/gauge";

/**
 * Square segmented progress meter (UI-PLAN U5): filled segments are gold, the
 * next one is outlined, and `n / total` plus the percentage sit to the right in
 * mono. Styles: styles/gauge.css.
 */
export function Gauge({
  done,
  total,
  label,
  hideLabel = false,
  size = "md",
}: {
  done: number;
  total: number;
  label: string;
  /** Keep the label for screen readers only (the caller shows its own). */
  hideLabel?: boolean;
  size?: "md" | "sm";
}) {
  const m = gaugeModel(done, total);
  const segments = Array.from({ length: m.segments }, (_, i) =>
    i < m.filled ? "done" : i === m.next ? "next" : undefined
  );

  return (
    <span className="gauge" data-size={size}>
      {hideLabel ? null : <span className="gauge-label label-field">{label}</span>}
      <span className="gauge-row">
        <span
          className="gauge-track"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={m.total}
          aria-valuenow={m.done}
          aria-valuetext={`${m.done} of ${m.total} (${m.percent}%)`}
          data-dense={m.segments > 24 ? "" : undefined}
        >
          {segments.map((state, i) => (
            <span key={i} className="gauge-seg" data-state={state} aria-hidden />
          ))}
        </span>
        {/* Width reserved for "total / total", so the track ends at the same x as the count grows. */}
        <span className="gauge-count tabular" style={{ minWidth: `${String(m.total).length * 2 + 3}ch` }} aria-hidden>
          {m.done} / {m.total}
        </span>
        <span className="gauge-pct tabular" aria-hidden>
          {m.percent}%
        </span>
      </span>
    </span>
  );
}
