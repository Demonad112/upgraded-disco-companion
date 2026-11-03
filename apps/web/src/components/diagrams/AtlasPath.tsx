/** Atlas path: start → Precursor Tower → Ancient Gateway → Burning Monolith (Arbiter of Ash). */

import { ArrowDef, Label, Line, Node } from "./parts";

export default function AtlasPath() {
  return (
    <svg viewBox="0 0 300 220" style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
      <ArrowDef id="dg-path-arrow" />
      <Label x={8} y={14} size={10} tone="accent">
        ROUTE TO THE ARBITER OF ASH
      </Label>

      {/* The route */}
      <Line d="M43 195 L97 157" arrow="dg-path-arrow" />
      <Line d="M122 140 L167 108" arrow="dg-path-arrow" />
      <Line d="M192 89 L242 53" arrow="dg-path-arrow" />
      {/* Trial-key node just off the path */}
      <Line d="M218 70 L254 104" dashed />

      {/* Maps on the way, and Powerful Map Boss nodes to route through */}
      <Node cx={60} cy={183} size={6} tone="line" />
      <Node cx={80} cy={169} size={6} tone="line" />
      <Label x={80} y={198} size={9} tone="mute">
        ≈3 MAPS
      </Label>
      <Node cx={145} cy={124} size={8} tone="danger" />
      <Node cx={218} cy={70} size={8} tone="danger" />

      <Node cx={36} cy={200} size={14} tone="line" />
      <Label x={36} y={218} size={9} anchor="middle" tone="mute">
        START
      </Label>

      <Node cx={110} cy={148} size={22} />
      <Label x={126} y={150} size={10}>
        PRECURSOR TOWER
      </Label>
      <Label x={126} y={162} size={9} tone="mute">
        REVEALS THE FORTRESS
      </Label>

      <Node cx={180} cy={98} size={22} />
      <Label x={164} y={88} size={10} anchor="end">
        ANCIENT GATEWAY
      </Label>
      <Label x={164} y={100} size={9} anchor="end" tone="mute">
        ATLAS POINTS START
      </Label>

      <Node cx={256} cy={42} size={24} />
      <Label x={238} y={36} size={10} anchor="end">
        BURNING MONOLITH
      </Label>
      <Label x={238} y={48} size={9} anchor="end" tone="accent">
        ARBITER OF ASH
      </Label>

      <Node cx={256} cy={108} size={10} tone="line" />
      <Label x={256} y={126} size={9} anchor="middle" tone="mute">
        TRIAL KEY
      </Label>

      {/* Legend */}
      <Node cx={190} cy={196} size={8} tone="danger" />
      <Label x={200} y={199} size={9} tone="mute">
        POWERFUL BOSS:
      </Label>
      <Label x={200} y={211} size={9} tone="mute">
        ROUTE THROUGH
      </Label>
    </svg>
  );
}
