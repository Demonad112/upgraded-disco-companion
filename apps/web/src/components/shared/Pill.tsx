export type PillTone = "good" | "warn" | "danger" | "neutral";

/** low / medium / high, as a tone and a 1–3 notch level. */
export const LEVEL_PILL: Record<string, { tone: PillTone; level: 1 | 2 | 3 }> = {
  low: { tone: "good", level: 1 },
  medium: { tone: "warn", level: 2 },
  high: { tone: "danger", level: 3 },
};

/**
 * A small labelled value ("Invest low"). Meaning never rides on colour alone: the value is written out, and three
 * square notches fill to the level, so with forced colours on the text and the notch count still say it (styles/strategy.css).
 */
export function Pill({ label, value, tone = "neutral", level }: { label: string; value: string; tone?: PillTone; level?: 1 | 2 | 3 }) {
  return (
    <span className="pill" data-tone={tone}>
      {level ? (
        <span className="pill-notches" data-level={level} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <span className="pill-k">{label}</span> <span className="pill-v">{value}</span>
    </span>
  );
}

/** Investment or risk pill from a low / medium / high value. */
export function LevelPill({ label, value }: { label: string; value: string }) {
  const m = LEVEL_PILL[value];
  return <Pill label={label} value={value} tone={m?.tone ?? "neutral"} {...(m ? { level: m.level } : {})} />;
}
