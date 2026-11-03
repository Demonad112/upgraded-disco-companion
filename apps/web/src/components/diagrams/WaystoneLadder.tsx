/** Waystone tier ladder: the three ways up a tier (reforge 3→1, Powerful Map Boss, Doryani). */

import { ArrowDef, Box, Label, Line, Node } from "./parts";

const TIERS = [
  { t: "T6", y: 40 },
  { t: "T5", y: 90 },
  { t: "T4", y: 140 },
  { t: "T3", y: 190 },
];

export default function WaystoneLadder() {
  return (
    <svg viewBox="0 0 300 220" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
      <ArrowDef id="dg-ladder-arrow" />
      <Label x={8} y={14} size={10} tone="accent">
        THREE WAYS UP A TIER
      </Label>

      {/* The ladder */}
      <Line d="M150 178 L150 153" arrow="dg-ladder-arrow" />
      <Line d="M150 128 L150 103" arrow="dg-ladder-arrow" />
      <Line d="M150 78 L150 53" arrow="dg-ladder-arrow" />
      {TIERS.map(({ t, y }) => (
        <Node key={t} cx={150} cy={y} size={24}>
          <Label x={150} y={y + 4} anchor="middle">
            {t}
          </Label>
        </Node>
      ))}
      <Label x={168} y={44} size={9} tone="mute">
        YOUR BEST DONE
      </Label>

      {/* 1. Reforge: three T3 → one T4 */}
      <Label x={52} y={174} size={10}>
        REFORGE
      </Label>
      {[38, 52, 66].map((cx) => (
        <Node key={cx} cx={cx} cy={190} size={10} />
      ))}
      <Label x={52} y={212} size={10} tone="accent" anchor="middle">
        3 → 1
      </Label>
      <Line d="M76 186 C 105 186, 122 160, 137 147" arrow="dg-ladder-arrow" />

      {/* 2. Powerful Map Boss: a T4 run drops a T5 */}
      <Node cx={244} cy={140} size={20} tone="danger" />
      <Label x={244} y={165} size={10} anchor="middle">
        POWERFUL BOSS
      </Label>
      <Label x={244} y={178} size={9} anchor="middle" tone="mute">
        DROPS +1 TIER
      </Label>
      <Line d="M236 130 C 222 105, 192 92, 164 90" arrow="dg-ladder-arrow" />

      {/* 3. Doryani: sells one tier below your best */}
      <Box x={20} y={79} w={72} h={22} />
      <Label x={56} y={94} size={10} anchor="middle">
        DORYANI
      </Label>
      <Line d="M93 90 L136 90" arrow="dg-ladder-arrow" />
      <Label x={56} y={114} size={9} anchor="middle" tone="mute">
        SELLS 1 TIER
      </Label>
      <Label x={56} y={126} size={9} anchor="middle" tone="mute">
        BELOW YOUR BEST
      </Label>
    </svg>
  );
}
