export const CURRENT_PATCH = "0.5.5";
/**
 * Every challenge league currently live, newest first. 0.5.5 launched Forbidden
 * Rites while Runes of Aldur kept running, so "the current league" is not one
 * value: a Runes of Aldur character is still current.
 */
export const LEAGUES = ["Forbidden Rites", "Runes of Aldur"] as const;
export const LEAGUE_LABEL = LEAGUES.join(" · ");

export const MECHANIC_LABELS: Record<string, string> = {
  breach: "Breach",
  abyss: "Abyss",
  delirium: "Delirium",
  ritual: "Ritual",
  expedition: "Expedition",
};

/**
 * Five mechanics needing five distinguishable hues.
 *
 * These reuse the damage-type palette rather than introducing a second
 * categorical scale. That palette is the only one in this project validated
 * against BOTH surfaces (six checks: chroma floor and pairwise
 * separation among them), and a mechanic chip has the same job a damage-split
 * segment does: be told apart at a glance. Naming a mechanic after a damage
 * type is a coincidence of the token names, not a claim about the game — the
 * chips carry their mechanic's name as text, so the colour never has to
 * carry the meaning alone.
 *
 * The text is the hue mixed toward white: on its own /20 fill the plain
 * --dmg-* step fails AA at chip size. Each percentage is the least lightening
 * that keeps 4.6:1 on the row and on its hover overlay (audit A11Y-01).
 */
export const MECHANIC_COLORS: Record<string, string> = {
  breach: "bg-chaos/20 text-[color-mix(in_srgb,var(--dmg-chaos)_90%,white)] border-chaos/40",
  abyss: "bg-physical/20 text-[color-mix(in_srgb,var(--dmg-physical)_85%,white)] border-physical/40",
  delirium: "bg-cold/20 text-[color-mix(in_srgb,var(--dmg-cold)_85%,white)] border-cold/40",
  ritual: "bg-fire/20 text-[color-mix(in_srgb,var(--dmg-fire)_80%,white)] border-fire/40",
  expedition: "bg-lightning/20 text-[color-mix(in_srgb,var(--dmg-lightning)_90%,white)] border-lightning/40",
};

export const ROADMAP_PHASE_LABELS: Record<string, string> = {
  "campaign-end": "Campaign End",
  "precursor-fortress": "Precursor Fortress",
  "arbiter-of-ash": "Arbiter of Ash",
  "t11-checkpoint": "T11 Gearing Checkpoint",
  "arbiter-of-divinity-loop": "Arbiter of Divinity — 2 kills = full Atlas",
  "full-tree": "Full Atlas Tree",
  "masters-and-mechanics": "Masters & League Quest Chains",
  "juiced-farming": "Juiced Farming Loop",
};
