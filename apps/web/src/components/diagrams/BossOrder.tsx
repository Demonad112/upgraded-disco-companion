/** Pinnacle boss order: Arbiter of Ash, then Arbiter of Divinity twice, with what each kill unlocks. */

import { ArrowDef, ink, Label, Line, Node } from "./parts";

const BOSSES = [
  {
    name: "ARBITER OF ASH",
    unlock: "UNLOCKS 3-MODIFIER TABLETS",
    weak: { fill: ink.cold, text: "WEAK TO COLD, RESISTS FIRE" },
  },
  {
    name: "ARBITER OF DIVINITY #1",
    unlock: "QUEST VERSION: OPENS TOP OF ATLAS",
    weak: { fill: ink.fire, text: "WEAK TO FIRE, RESISTS LIGHTNING" },
  },
  { name: "ARBITER OF DIVINITY #2", unlock: "NON-QUEST: UNLOCKS FULL ATLAS", weak: null },
];

export default function BossOrder() {
  return (
    <svg viewBox="0 0 300 200" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
      <ArrowDef id="dg-boss-arrow" />
      <Label x={8} y={14} size={10} tone="accent">
        KILL IN THIS ORDER
      </Label>
      <Line d="M26 67 L26 88" arrow="dg-boss-arrow" />
      <Line d="M26 127 L26 148" arrow="dg-boss-arrow" />
      {BOSSES.map((b, i) => {
        const y = 30 + i * 60;
        return (
          <g key={b.name}>
            <Node cx={26} cy={y + 18} size={36}>
              <Label x={26} y={y + 23} size={15} anchor="middle" tone="accent">
                {String(i + 1)}
              </Label>
            </Node>
            <Label x={56} y={y + 12} size={12}>
              {b.name}
            </Label>
            <Label x={56} y={y + 26} size={9} tone="mute">
              {b.unlock}
            </Label>
            {b.weak ? (
              <>
                <rect x={56} y={y + 32} width={8} height={8} style={{ fill: b.weak.fill }} />
                <Label x={70} y={y + 40} size={9} tone="mute">
                  {b.weak.text}
                </Label>
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
