import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScrollSpyNav } from '@/components/shared/ScrollSpyNav'
import { AnchorLink } from '@/components/shared/AnchorLink'
import { METHODOLOGY_SECTIONS } from '@/data/methodology'

export const metadata: Metadata = {
  title: 'Methodology — PoE2 Endgame Companion',
  description:
    'How the Character page grades a build, ranks findings and labels numbers, and what it refuses to guess.',
}

/*
 * Every statement on this page restates code in packages/core/src or copy the
 * UI already shows. Each block cites its source in a comment. Anything that
 * could not be traced was left out, not paraphrased into existence.
 */

const TITLE = Object.fromEntries(METHODOLOGY_SECTIONS.map((s) => [s.id, s.title]))

function Section({ id, children }: { id: string; children: ReactNode }) {
  const title = TITLE[id]!
  return (
    <section id={id} className="page-section scroll-mt-16" aria-labelledby={`${id}-title`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id={`${id}-title`} className="section-title !mb-0">
          {title}
        </h2>
        <AnchorLink id={id} label={title} />
      </div>
      <div data-surface="data" className="card space-y-3 text-sm leading-relaxed text-ink-dim">{children}</div>
    </section>
  )
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-mono text-xs text-ink">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function MethodologyPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Methodology"
        title="How the analysis"
        accent="works"
        // Wording from the Character page header (app/character/page.tsx).
        description="The Character page reads poe.ninja’s data and ranks what to fix. This page explains what is read as given, what is worked out here and what is left unguessed."
      />

      <div>
        <ScrollSpyNav label="On this page" items={METHODOLOGY_SECTIONS} />

        <Section id="grade">
          {/* packages/core/src/score/index.ts (assessBuild), packages/core/src/thresholds.ts */}
          <p>
            The grade has two equal halves, defence and damage, each worth up to 0.5. Keystones are applied first because they can change a verdict: a Chaos Inoculation build is not “short on chaos resistance”. Chaos Inoculation, Eldritch Battery, Mind Over Matter, Iron Reflexes, Resolute Technique, Avatar of Fire and Necromantic Talisman change the reading; Blood Magic, Eternal Youth, Zealot’s Oath, Glancing Blows, Hollow Palm Technique, Blackflame Covenant and a few others add a note.
          </p>
          <p>The defensive half adds up:</p>
          <Rows
            rows={[
              ['0.30', 'Your lowest maximum hit across the five damage types: nothing at 2,000 or less, full at 6,000 or more, linear between.'],
              ['0.15', 'Each elemental resistance on damage taken, (1 − cap) ÷ (1 − resistance), against the character’s own maximum as poe.ninja reports it. Two points short scores most of its share.'],
              ['0.05', 'Chaos resistance the same way, toward its cap. Chaos Inoculation or chaos immunity earns it outright.'],
            ]}
          />
          <p>
            Damage compares your best hitting skill with the ladder for your league and ascendancy. It scores 0.50 at the sample’s upper quarter or above, 0.40 from its median up, 0.28 from its lower quarter up and 0.15 below that.
          </p>
          <Rows
            rows={[
              ['A', '0.75 and above'],
              ['B', '0.50 to 0.75'],
              ['C', '0.30 to 0.50'],
              ['D', 'below 0.30'],
            ]}
          />
          <p>
            When damage can’t be graded (no ladder sample or no hitting skill), the score runs from the defence half plus 0.15 (the lowest damage score) to the defence half plus 0.5, and the grade shows as a range such as{' '}
            <span className="font-mono text-ink">D–B</span>. Guessing would invent a damage score, and scoring zero would punish the build for missing data.
          </p>
          <p>
            The maximum-hit and resistance scales are this project’s judgement, not game constants. Your pool (life + energy shield, plus mana under Mind Over Matter) is shown but not graded.
          </p>
        </Section>

        <Section id="largest-hit">
          {/* packages/core/src/defense/index.ts (analyzeDefense), packages/core/src/thresholds.ts (WEAK_HIT_RATIO),
              packages/core/src/defense/implied.ts, packages/core/src/defense/whatif.ts */}
          <p>
            Survival is led by the smallest hit that kills you. poe.ninja reports the biggest hit you survive for each damage type, and the lowest one is the headline.
          </p>
          <p>
            Any type below 40 % of your best maximum hit is named as a weak spot, not just the lowest. That compares your types with each other; the data has no enemy hit sizes, so it is not a one-shot claim.
          </p>
          <p>
            For a hit mitigated only by resistance, the largest survivable hit is{' '}
            <span className="font-mono text-ink">pool / (1 − resistance)</span>. The app uses this in two labelled places: to show the resistance poe.ninja’s maximum hits imply, when the physical maximum hit equals your life and energy shield pool; and in the What-if resistance sliders, which rescale the maximum hit as{' '}
            <span className="font-mono text-ink">maxHit × (1 − effective) / (1 − effective′)</span>, with resistance
            clamped to its cap.
          </p>
        </Section>

        <Section id="ehp">
          {/* packages/core/src/defense/index.ts (header and DefenseSummary.effectiveHealthPool),
              components/DefensePanel.tsx (EHP line), components/character/CharacterVerdict.tsx (ratio) */}
          <p>
            Effective health pool is poe.ninja’s averaged pool. It is reported, and drawn on the maximum-hit chart as a
            dashed line, but never led with.
          </p>
          <p>
            An average hides the damage type you have no answer to: the reference character reads 13,569 EHP, yet a 3,808 chaos hit kills it. When EHP overstates the smallest killing hit by more than 1.5×, the verdict says so.
          </p>
        </Section>

        <Section id="findings-ranking">
          {/* packages/core/src/recommend/rank.ts (COST_WEIGHT, compareRecommendations), packages/core/src/recommend/focus.ts,
              packages/core/src/thresholds.ts (FOCUS_CATEGORY_WEIGHTS), components/Recommendations.tsx */}
          <p>
            Findings are ranked by score gain for cost, so a free fix beats an equal-sized fix that costs currency. Ties go to the bigger gain in lowest maximum hit, then damage.
          </p>
          <Rows
            rows={[
              ['Free', '0.5'],
              ['Passive', '2'],
              ['Gear', '4'],
              ['Currency', '5'],
            ]}
          />
          <p>
            Gear means owned or swappable; currency means bought or crafted. A cost with an amount multiplies the weight. A finding with no measured gain, or an unknown cost, ranks after the rest.
          </p>
          <p>
            Every number comes from the imported data or is derived from it (What-if and score-gain figures are derived). Anything that can’t be confirmed is listed under “Could not be determined”, and findings a keystone rules out are listed separately.
          </p>
          <p>
            The optional Mapping and Bossing views reorder the same list: Mapping weights damage and efficiency × 1.25 and survivability × 0.85; Bossing weights survivability × 1.25, damage × 1.1 and efficiency × 0.85. The default view applies no weighting.
          </p>
        </Section>

        <Section id="labels">
          {/* packages/core/src/model/provenance.ts (INFO), packages/core/src/reconcile/index.ts (classify),
              components/shared/SourceFlag.tsx */}
          <p>Every figure carries one of five labels, and one kind is never shown as another:</p>
          <Rows
            rows={[
              ['Observed', 'Read as given from poe.ninja or the Path of Building export it attaches. Not recomputed here.'],
              ['PoB-simulated', 'Measured by running Path of Building. Kept apart from observed values.'],
              ['Derived', 'Arithmetic done here on observed values. Check it against the source before relying on it.'],
              ['Nominal', 'What the game data says it grants in isolation. Not measured on this build.'],
              ['Unknown', 'The data cannot establish this value. A missing label is unknown, never observed.'],
            ]}
          />
          <p>
            Where Path of Building or the app’s formulas disagree with poe.ninja, it is flagged: within 0.5 % is a match, within 5 % (or one unit of rounding) is minor, and anything larger is major. Resistances and charges are capped, so for them a 1-point difference is major.
          </p>
          <p>
            Reference content on the Checklist and Atlas pages is flagged{' '}
            <span className="text-warn">Unverified</span> or{' '}
            <span className="text-danger">Conflicting sources</span> when its source is not confirmed; verify those in-game.
          </p>
        </Section>

        <Section id="sources">
          {/* packages/core/src/defense/index.ts (header), packages/core/src/dps/index.ts (header),
              packages/core/src/ninja/ladder.ts (header), packages/core/src/dataage/index.ts,
              packages/core/src/thresholds.ts (DATA_AGE_STALE_HOURS), apps/web/src/lib/proxy.ts */}
          <p>
            <strong className="text-ink">Read from poe.ninja:</strong> defences (maximum hits, resistances, pool, effective health pool) and per-skill damage. The damage module only reads and labels these figures.
          </p>
          <p>
            <strong className="text-ink">Computed here:</strong> the grade, the finding order, implied resistances, What-if projections and the ladder comparison. The app’s own formulas are only used to project and to cross-check poe.ninja.
          </p>
          <p>
            <strong className="text-ink">Ladder sample:</strong> poe.ninja’s builds search gives the top 100 rows, nearly all level 100. It can say “the best builds of your class run X”, so the damage grade places you within that sample, never in the whole ladder.
          </p>
          <p>
            Character data over 24 hours old is marked out of date, since newer gear changes won’t show. The browser can’t call poe.ninja directly, so reads go through this project’s proxy.
          </p>
        </Section>

        <Section id="farm-planner">
          {/* data/farm/tablets-0.5.5.json (rules, weights, sources), lib/farm/* (totals, score, swaps, danger) */}
          <p>
            The Dashboard’s farm planner scores a map, not a drop. It adds what the tablets and Waystone give, weights each stat for your farm, subtracts the danger and reports three figures:
          </p>
          <Rows
            rows={[
              ['Reward', 'Σ (stat total × the preset’s weight for that stat). A stat with no weight in the preset adds nothing.'],
              ['Danger', 'Σ (stat total × the stat’s danger rating). Only stats the data rates as hazards count.'],
              ['Net', 'Reward − Danger × the danger setting: 1.5 for Play safe, 1 for Balanced, 0.5 for Greedy.'],
            ]}
          />
          <p>
            Totals add by default, “less” stats multiply and flags count. Rolls scale with the Atlas passives you tick, and changes show as a percentage of the starting figure (“new” when that is 0).
          </p>
          <p>
            Weights and danger ratings (0 to 3 per defence layer) come from a fact-check of patch 0.5.5 and are relative judgements; the footnote counts the unverified ones. With “Danger for my build” on, the rating averages the layers your last imported character relies on.
          </p>
          <p>
            A farm tile reads “Fits your build” or “Harder for your build” only when that farm has a saved loadout with danger mods and a character is imported. The rule is this app’s own and is labelled unverified.
          </p>
          <p>
            Rules come from the data: up to 3 tablets per map (4 with overlapping towers or a City map), and a Waystone takes 6 mods (10 once corrupted). Spawn weights aren’t available, so roll odds aren’t modelled.
          </p>
          <p>
            It is a ranking aid. The danger scale is not calibrated against run logs yet, so treat a large Net swing from a
            single danger stat with suspicion.
          </p>
        </Section>

        <Section id="not-guessed">
          {/* packages/core/src/thresholds.ts (header), packages/core/src/score/index.ts,
              packages/core/src/defense/index.ts (ResistanceState), packages/core/src/dataage/index.ts,
              components/BuildScore.tsx, components/Recommendations.tsx */}
          <p>
            <strong className="text-ink">No DPS thresholds.</strong> Damage is only compared with figures seen on the ladder, never made-up targets. Without a sample, the damage half stays unscored.
          </p>
          <p>
            <strong className="text-ink">Missing is not zero.</strong> A resistance that wasn’t reported is unknown, neither credited nor listed as short. An unreported maximum hit isn’t graded, and a missing update time reads “unknown”.
          </p>
          <p>
            <strong className="text-ink">Unconfirmed keystones are not applied.</strong> A keystone that is allocated
            but whose effect is not corroborated is named in the caveats, and its corrections are left out.
          </p>
          <p>Stated rather than guessed — a wrong number is worse than a missing one.</p>
        </Section>
      </div>
    </div>
  )
}
