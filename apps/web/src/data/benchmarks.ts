import type { BenchmarkGate } from "@/lib/types";
import { atlasSource, strategySource, video05Source, videoSource } from "./sourceMeta";

export const benchmarkGates: BenchmarkGate[] = [
  {
    id: "b-t11-gear-floor",
    label:
      "Stop at T11 to gear up and cap resistances. It gives nearly all the loot of T15 for far less risk.",
    severity: "hard-gate",
    appliesBeforeStepId: "step-t11-park",
    source: strategySource(),
  },
  {
    id: "b-waystone-5mod",
    label:
      "Keep 5-mod Waystones coming before you invest in a league mechanic.",
    severity: "soft-guideline",
    source: strategySource(),
  },
  {
    id: "b-pinnacle-readiness",
    label:
      "Have 5,000+ life and 80%+ resistances before pinnacle bosses.",
    severity: "hard-gate",
    source: strategySource(),
  },
  {
    id: "b-level85-ascendancy",
    label:
      "Reach level 85 and finish your 4th Ascendancy before the Arbiter of Divinity.",
    severity: "hard-gate",
    source: strategySource(),
  },
  {
    id: "b-enigma-t10",
    label: "Enigma Chambers require Tier 10 Waystones minimum.",
    severity: "hard-gate",
    source: atlasSource(),
  },
  {
    id: "b-waystone-breakpoints",
    label:
      "Quests need T6, T11 and T14 Waystones. Buy a spare from Doryani after each one.",
    severity: "soft-guideline",
    source: atlasSource(),
  },
  {
    id: "b-gateway-t5",
    label: "The East Gateway needs a T5+ Waystone — reforge 3→1 if you don't have one.",
    severity: "hard-gate",
    source: videoSource(["5Vp_3gUFbwI@04:35"]),
  },
  {
    id: "b-ascendancy-3-at-70",
    label: "Do your 3rd Ascendancy at about level 70, a little over-levelled to be safe.",
    severity: "soft-guideline",
    source: video05Source(["VSeDfybR3Cc@06:03"]),
  },
  {
    id: "b-honour-75",
    label:
      "Bring relics for 75% Honour Resistance to the Ascendancy trial. Losing Honour fails it.",
    severity: "hard-gate",
    source: video05Source(["VSeDfybR3Cc@06:03"]),
  },
  {
    id: "b-divinity-t15",
    label:
      "Clear T15 comfortably before the second Arbiter of Divinity. It's tougher than the first.",
    severity: "soft-guideline",
    source: videoSource(["5Vp_3gUFbwI@07:39"]),
  },
];
