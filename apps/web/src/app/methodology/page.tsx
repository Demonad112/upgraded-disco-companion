import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ScrollSpyNav } from '@/components/shared/ScrollSpyNav'
import { AnchorLink } from '@/components/shared/AnchorLink'
import { METHODOLOGY_SECTIONS } from '@/data/methodology'

export const metadata: Metadata = {
  title: 'Methodology — PoE2 Endgame Companion',
  description:
    'How the Character page grades a build, ranks its findings and labels every number — and what it deliberately does not guess.',
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
      <div className="card space-y-3 text-sm leading-relaxed text-ink-dim">{children}</div>
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
        description="The Character page reads poe.ninja’s own computed character data and turns it into ranked, quantified findings. This page sets out how — what is read as given, what is computed here, and what is deliberately left unguessed."
      />

      <div>
        <ScrollSpyNav label="On this page" items={METHODOLOGY_SECTIONS} />

        <Section id="grade">
          {/* packages/core/src/score/index.ts (assessBuild), packages/core/src/thresholds.ts */}
          <p>
            The grade has two halves of equal weight, each worth up to 0.5: defence and damage. Allocated keystones are
            applied first, because they can invalidate a verdict — a Chaos Inoculation build is not “short on chaos
            resistance”.
          </p>
          <p>The defensive half adds up:</p>
          <Rows
            rows={[
              ['0.30', 'Combined pool (life + energy shield + ward) above 6,000. Between 4,000 and 6,000 earns 0.15.'],
              ['0.15', 'All three elemental resistances at the character’s own maximum, as poe.ninja reports it.'],
              ['0.05', 'Chaos resistance at or above 30 %, or immunity to chaos damage.'],
            ]}
          />
          <p>
            The damage half grades the best skill that actually hits against the ladder sample for the league and
            ascendancy: 0.50 in the upper quarter of the sample, 0.40 from the median up, 0.28 in the lower quarter
            and 0.15 below it.
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
            When damage cannot be graded — no ladder sample, or no skill that deals hit damage — the score is the
            interval from the defensive half alone to that plus 0.5, and the grade is shown as a range such as{' '}
            <span className="font-mono text-ink">D–B</span>. Scaling the measured half up would invent a damage
            score; reporting the floor would punish the build for evidence nobody could collect.
          </p>
          <p>
            The pool and resistance bands are judgement calls, not game constants, and are declared in one place so
            one number cannot draw different verdicts on one screen.
          </p>
        </Section>

        <Section id="largest-hit">
          {/* packages/core/src/defense/index.ts (analyzeDefense), packages/core/src/thresholds.ts (ONE_SHOT_RATIO),
              packages/core/src/defense/implied.ts, packages/core/src/defense/whatif.ts */}
          <p>
            Survivability is led by the smallest hit that kills. poe.ninja reports the maximum hit a character
            survives for each damage type — physical, fire, cold, lightning and chaos — and the lowest of them is the
            headline.
          </p>
          <p>
            Every type whose maximum hit is below 40 % of the character’s best is named as a one-shot risk, not only
            the lowest: physical can sit under the line alongside chaos, and physical hits are far more common in
            maps.
          </p>
          <p>
            For a hit mitigated only by resistance, the largest survivable hit is{' '}
            <span className="font-mono text-ink">pool / (1 − resistance)</span>. The app uses that relation in two
            places, both labelled as derived: to show the resistance poe.ninja’s elemental maximum hits imply, and
            only when the physical maximum hit equals the life and energy shield pool (so nothing else mitigated it);
            and in the What-if resistance sliders, which rescale the reported maximum hit as{' '}
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
            An average hides the damage type a build has no answer to. On the reference character EHP reads 13,569
            while a 3,808 chaos hit kills — EHP overstates survivability there by about 3.5 times. Where EHP
            overstates the smallest killing hit by more than 1.5 times, the Character verdict states the ratio.
          </p>
        </Section>

        <Section id="findings-ranking">
          {/* packages/core/src/recommend/index.ts (COST_WEIGHT, score), packages/core/src/recommend/focus.ts,
              packages/core/src/thresholds.ts (FOCUS_CATEGORY_WEIGHTS), components/Recommendations.tsx */}
          <p>
            Findings are ranked by gain per unit of cost: the size of the measured impact divided by a cost weight,
            so a free fix always outranks an equal-sized fix that costs currency.
          </p>
          <Rows
            rows={[
              ['Free', '0.5'],
              ['Passive', '2'],
              ['Gear', '4'],
              ['Currency', '5'],
              ['Unknown', '6'],
            ]}
          />
          <p>
            The weight is multiplied by the amount when a cost has one. A finding whose impact cannot be quantified
            ranks last among actionable items: it is real, but a measured gain outranks an unmeasured one.
          </p>
          <p>
            Every number a finding shows is grounded in the payload. Where one cannot be established, it is listed
            under “Could not be determined” with exactly what is missing. Findings an allocated keystone rules out are
            listed separately, with the reason.
          </p>
          <p>
            The optional Mapping and Bossing views re-order the same list by category — Mapping weights damage and
            efficiency × 1.25 and survivability × 0.85; Bossing weights survivability × 1.25, damage × 1.1 and
            efficiency × 0.85. Nothing is added or dropped, and the default view applies no weighting.
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
            Where Path of Building’s exported stats, or the app’s own formulas, disagree with poe.ninja, the
            disagreement is flagged rather than silently resolved: within 0.5 % is a match, within 5 % (or one unit of
            rounding) is minor, and anything larger is major.
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
            <strong className="text-ink">Read from poe.ninja:</strong> defences — maximum hits, resistances, pool,
            effective health pool — and per-skill damage. The damage module computes nothing; it reads, labels and
            shapes poe.ninja’s figures.
          </p>
          <p>
            <strong className="text-ink">Computed here:</strong> the grade, the ranking of findings, implied
            resistances, What-if projections and the comparison against the ladder. The app’s own game formulas are
            used only for projection and to cross-check poe.ninja.
          </p>
          <p>
            <strong className="text-ink">Ladder sample:</strong> poe.ninja’s builds search returns one page of the
            top 100 rows, essentially all level 100. It supports “the best builds of your class run X”; it does not
            support “you are in the Nth percentile of players”, and the app never phrases it that way.
          </p>
          <p>
            Character data more than 24 hours old is called out of date: gear changes since then are invisible to the
            analysis. The browser cannot call poe.ninja directly, so every read goes through this project’s own
            proxy.
          </p>
        </Section>

        <Section id="not-guessed">
          {/* packages/core/src/thresholds.ts (header), packages/core/src/score/index.ts,
              packages/core/src/defense/index.ts (ResistanceState), packages/core/src/dataage/index.ts,
              components/BuildScore.tsx, components/Recommendations.tsx */}
          <p>
            <strong className="text-ink">No DPS thresholds.</strong> Damage is graded only against figures observed on
            the ladder — never against invented thresholds. Without a sample, the damage half is left unscored.
          </p>
          <p>
            <strong className="text-ink">Missing is not zero.</strong> A resistance the payload did not report is
            unknown: it is neither credited nor listed as a shortfall. An incomplete pool is not graded. An absent
            update time is “unknown”, never fresh and never stale.
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
