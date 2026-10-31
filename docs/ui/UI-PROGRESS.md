# UI progress

Plan: [UI-PLAN.md](UI-PLAN.md). Protocol: [SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md). One wave view in run order; tick a
session's row in its last commit. Audit rows are tracked in `docs/audit/08-PROGRESS.md`.

| Wave | Session | Where | Model | Status | Branch | PR | Preview | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | U0 decisions, tracker, protocol | Local | Sonnet 5.5 · medium | done | docs/ui-plan | #16 | | Docs only |
| 1 | A1 P0 and quick wins | Cloud | Opus 5.5 · high | done | ccr-dfb2d784-xtiycv | #17 | https://ccr-dfb2d784-xtiycv.upgraded-disco-companion.pages.dev | follow-ups #18 (cloud e2e browser), #20 (zod 4) |
| 2 | A2 cache headers | Cloud | Sonnet 5.5 · medium | done | claude/gallant-einstein-z0ygk6 | #23 | https://claude-gallant-einstein-z0yg.upgraded-disco-companion.pages.dev | tracked in docs/audit/08-PROGRESS.md |
| 2 | U1 page headers | Cloud | Sonnet 5.5 · medium | done | claude/ecstatic-newton-km9len | #22 | https://claude-ecstatic-newton-km9le.upgraded-disco-companion.pages.dev | One `PageHeader` on 4 pages; e2e findings selector re-pointed |
| 3 | A3 bundle and service worker | Local + Cloud | Opus 5.5 · high | done | ccr-08fbadda-bnx58s | #25, #26 | https://ccr-08fbadda-bnx58s.upgraded-disco-companion.pages.dev | tracked in docs/audit/08-PROGRESS.md; T03+T04 in #25 |
| 3 | U9 Methodology and What's new | Cloud | Opus 5.5 · high | done | variant/20261029-pages | #24 | https://variant-20261029-pages.upgraded-disco-companion.pages.dev | `/methodology`, `/whats-new`, Ctrl K entries, patch-menu link; sitemap for A6, footer for U7 |
| 4 | A4 canvases and a11y | Cloud | Opus 5.5 · medium | done | ccr-95ecf788-uv8w93 | #28 | https://ccr-95ecf788-uv8w93.upgraded-disco-companion.pages.dev | tracked in docs/audit/08-PROGRESS.md; T09, T10, T11 |
| 4 | U8 home page | Cloud | Opus 5.5 · high | done | variant/20261029-home | #27 | https://variant-20261029-home.upgraded-disco-companion.pages.dev | Meta strip and tool-card status lines, all counted from data; Character card grade added in OQ1 (U8-4) |
| 5 | A5 constellation sky | Cloud | Opus 5.5 · high | done | ccr-adc6b4c8-t74ga8 | #29 | https://ccr-adc6b4c8-t74ga8.upgraded-disco-companion.pages.dev | tracked in docs/audit/08-PROGRESS.md; T06, T08, T07, T05 |
| 6 | A6 SEO, landmarks, CI | Cloud | Sonnet 5.5 · medium | done | claude/gallant-gates-fwoykk | #32 | https://claude-gallant-gates-fwoykk.upgraded-disco-companion.pages.dev | tracked in docs/audit/08-PROGRESS.md; T15, T17, T12 |
| 6 | U12 installable app | Cloud | Sonnet 5.5 · high | done | variant/20261029-pwa | #31 | https://variant-20261029-pwa.upgraded-disco-companion.pages.dev | Update toast, offline chip and install button built; chip and button unmounted (U6, U7); manifest shortcuts |
| 7 | A7 design tokens | Local | Opus 5.5 · high | done | claude/a7-design-tokens | #45 | https://claude-a7-design-tokens.upgraded-disco-companion.pages.dev | tracked in docs/audit/08-PROGRESS.md; T19, `tokens.css`, sky palette tokens |
| 7 | A8 proxy CORS | Cloud | Sonnet 5.5 · medium | done | claude/hopeful-gauss-vi5thy | #44 | | tracked in docs/audit/08-PROGRESS.md; T20; owner deploys the proxy |
| 8 | U2 surfaces and connectors | Local | Opus 5.5 · high | done | variant/20261029-surfaces | #46 | https://variant-20261029-surfaces.upgraded-disco-companion.pages.dev | `--data-fill` on 42 panels via `data-surface` (+ Up next on `/checklist`, U2-5); connectors opt-in (`[data-links]`, checklist flow only); style stubs for U3–U7 |
| 9a | U3 typography and labels | Cloud | Sonnet 5.5 · medium | done | variant/20261029-type | #49 | https://variant-20261029-type.upgraded-disco-companion.pages.dev | `.title-sentence`, `.label-metric`, `.label-field` in `type.css`; full value in `title` on compact figures; U1-1 and U8-2 done |
| 9b | U4 controls kit | Cloud | Opus 5.5 · high | done | variant/20261030-controls | #50 | https://variant-20261030-controls.upgraded-disco-companion.pages.dev | `Select`, `Segmented`, `Range`, `Button` in `shared/controls.tsx` + `controls.css`; one focus ring; `rounded-*` removed (200 uses); keyboard pass in PR |
| 10 | U5 segmented gauge | Cloud | Sonnet 5.5 · medium | done | variant/20261030-gauge | #52 | https://variant-20261030-gauge.upgraded-disco-companion.pages.dev | `Gauge` + `lib/gauge.ts` replace `ProgressBar`; one segment per unit ≤ 40, else 20; `.glow-*` removed; U8-1 done; `main` (with #50) merged in |
| 10 | U6 phone tab bar | Cloud | Sonnet 5.5 · high | done | variant/20261030-tabbar | #53 | https://variant-20261030-tabbar.upgraded-disco-companion.pages.dev | `MobileTabBar` ≤ 720 px (hides in compact and with the keyboard); header keeps brand, offline chip, Search, Patch; short phone banner with ⓘ → Patch menu; U12-1, U12-3, U9-4 done |
| 11 | U7 full footer | Cloud | Sonnet 5.5 · medium | done | variant/20261030-footer | #60 | https://variant-20261030-footer.upgraded-disco-companion.pages.dev | Four-column footer (Tools, Resources, Data, Settings); `InstallButton` mounted; Methodology and What's new linked; A6-3, U12-2 done |
| 12 | U10 character page | Local | Opus 5.5 · high | done | variant/20261031-character | #63 | https://variant-20261031-character.upgraded-disco-companion.pages.dev | `Input`/`Textarea` in controls kit; grade ladder; Spare + Since one row; defence pair footers; sliding tab underline + Findings count; overview skeleton; U4-3, U4-4, U3-2 done |
| 12 | U11a checklist | Cloud | Sonnet 5.5 · medium | done | variant/20261031-checklist | #62 | https://variant-20261031-checklist.upgraded-disco-companion.pages.dev | One-row phase rail (`n/total` + `Gauge` sm per chip); Reference group; Am I ready? equal height + CTA; terms glossed once per step; done steps dim; `styles/checklist.css` |
| 13 | U11b dashboard and atlas | Cloud | Sonnet 5.5 · medium | done | variant/20261031-dash-atlas | #64 | https://variant-20261031-dash-atlas.upgraded-disco-companion.pages.dev | Strategy rows as an aligned grid with text+notch pills, tier legend, quiz Reset, boss stat tiles; Atlas legend with counts in the map panel, vertical `+ − fit` group (keys `+ - 0`), `Input` search with clear and count, Map = `Button` sm; tab says "Dashboard"; no backdrop-filter on map controls; U6-2, U4-2, U4-4, U2-3 done |
| 14 | U13 final QA | Local | Opus 5.5 · high | todo | | | | Final QA, local |

## Backlog
| Item | Batch | Status | PR | Notes |
|---|---|---|---|---|
| Share card (PNG of the verdict, drawn in the browser) | P1 | done | #55 | `ShareCard.tsx`, `lib/shareCard.ts`; preview dialog, Download PNG, Share… where files can be shared |
| What-if as an instrument | P1 | done | #55 | `CountUp`, ghost tick where a hit bar started, grade pulse on a letter change |
| Inline glossary terms | P1 | done | #55 | `Gloss.tsx`; checklist step text and finding rationale; `GlossaryTerm.matches` |
| 404 and error pages | P1 | done | #55 | `app/not-found.tsx` (404.html), `app/error.tsx` with Copy details |
| Forced-colours support | P1 | done | #55 | Segments, range, select chevron, glossary in `controls.css` / `polish.css` |
| Card-hover pulse and hero draw-in | W15-2 | done | #59 | CSS only in `polish.css`; `e2e/motion.spec.ts`; cursor spotlight stays deferred |
| PR body guard (no session info) | SB3 | done | #58 | `pr-body-guard.yml`, `scripts/check-pr-body.mjs`; making it a required check is SB3-1 (owner) |
