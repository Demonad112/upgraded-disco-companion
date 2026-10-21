export function ProgressBar({
  percent,
  label,
}: {
  percent: number;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex justify-between text-xs text-ink-mute">
          <span>{label}</span>
          <span className="tabular font-medium text-ink">{clamped}%</span>
        </div>
      )}
      <div
        className="glow-track"
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
      >
        <div className="glow-fill" style={{ width: `${clamped}%` }}>
          <span className="glow-bead" aria-hidden />
        </div>
      </div>
    </div>
  );
}
