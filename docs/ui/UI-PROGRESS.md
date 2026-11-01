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
| 14 | U13a final QA (code + automated) | Cloud | Opus 5.5 · high | done | claude/blissful-cori-4gj37n | #65 | https://claude-blissful-cori-4gj37n.upgraded-disco-companion.pages.dev | Share card cuts at a word (P1-4); `--data-fill-blur` gone (U2-4); roving tabindex + linked tabpanels (U4-1); no backdrop-blur on tree/workbench (U11b-1); StrategyCard Pin = `Button` (U11b-3); `/character/` results lazy-loaded, 273.6 → 226.8 KB br (U13a-4); PR body guard reads the live body |
| 14 | U13b final QA (devices, Lighthouse) | Local | Opus 5.5 · high | done | variant/20261101-qa | #66 | https://variant-20261101-qa.upgraded-disco-companion.pages.dev | First Lighthouse baseline (`04-PERFORMANCE-BASELINE.md`); import, install, share card, tab bar, Atlas map and keyboard walk checked in emulation; A7-4 20/20 on Windows; SW no longer fails every request when Cache Storage errors; real-phone remainder is Backlog U13b-1 (owner) |

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

Open items from every carry file after U13b (2026-11-01). Size: S ≤ ½ day, M ≤ 2 days, L more. Batch = owner: the owner
decides or acts; sessions don't implement it.

| Item | Batch | Status | PR | Notes |
|---|---|---|---|---|
| U13a-4: load `@poe2/core`'s analysis on demand (`await import` in `handleResult`) | next-U | todo · M | | `/character/` is already 226,768 B br (under 250 KB). Recommended: do it only if a later change pushes the route over budget; measure with `route-weight.mjs` first |
| U13a-5: `/` sits at +8.4 KB of its +10 KB budget (187,507 B br) | next-U | rule · S | | Any change that touches home JS measures `route-weight.mjs` before and after, in the PR |
| U13a-6: `CommandPalette` and `SearchDialog` overlays keep `backdrop-blur-sm` | next-U | todo · S | | Recommended: keep; transient modals, the compositor cost lasts only while they're open. Drop only if review wants zero backdrop-filter |
| U10-3: Checks tab has no count chip | next-U | todo · S | | Recommended: leave out until a batch defines one honest figure for four mixed panels |
| U2-1: a bare `.card` outside home needs `data-surface="data"` | next-U | rule · S | | Standing rule; `Panel`, `Accordion`, `WarningPanel` set it themselves |
| A7-1 / A7-3: new tokens go in `tokens.css`; canvas code reads only colours from tokens | next-U | rule · S | | Standing rules (the minifier rewrites colours inside custom properties) |
| SB1-1: proxy lockfile, `npm ci` and audit if `services/ninja-proxy` ever gains runtime deps | next-A | rule · S | | Nothing to do today (no deps) |
| U13b-2: Character import shifts the page once (CLS 0.11 at 390, Fast 3G): the import box collapses to "Load another character" when the analysis lands | next-U | todo · S–M | | Recommended: collapse the box as the import starts (`busy`), so the skeleton sits where the panels will; or hold the box's height until the panels mount. Pre-existing, not from #65 |
| U13b-3: scroll-spy keeps "Progress" current after tapping the last tab (Checks) in landscape | next-U | todo · S | | Mark the last link current when the page is scrolled to the bottom (`ScrollSpyNav`) |
| U13b-4: Lighthouse `NO_NAVSTART` on `/character/` in 4 of 7 runs | next-A | watch · S | | Retry when it happens; trace one run (`--save-assets`) if it persists on a later Chrome. The page makes no client-side navigation |
| U13b-5: e2e flake, `[desktop]` sideways scroll at 280 px is 20 px over, intermittently, in `dash-atlas.spec.ts` (dashboard) and `nav.spec.ts:60` (home); 3 times across the Windows runs. Likely the "Data updated" header badge (unverified) | next-U | bug · S | | Read the run-3 traces (`C:\Dev\data\poe2-variants61101-qa\e2e-run3-traces\`), fix the wide element; don't loosen the assertion |
| A3-2: owner's 11 Windows-only e2e failures | owner | close · S | | Not reproduced in U13b: a quiet full run on the owner's machine is 240/241, one flake (U13b-5). Recommended: close |
| Service worker survives a Cache Storage failure | U13b | done | | `sw.js` treats a cache error as "no cache" instead of failing every request (found in U13b; see `docs/carry/U13b.md`) |
| U13b-1: real-device remainder: U6-3 (keyboard hides tab bar, iOS Safari + Android Chrome), U12-4 / U7-2 on a phone (Install / Add to Home Screen), P1-3 on a real Safari 17, U10-2 on a real phone (rotation), U11b-2 with VoiceOver | owner | todo · S | | U13b ran the emulated versions (see `docs/carry/U13b.md`); these need hardware this machine doesn't have |
| A5-4 / W15-pulse-1: watch the sky ~30 s, and the hover pulse and hero draw-in, on a real display | owner | todo · S | | `LEVELS` is already 16 (`components/fx/sky/draw.ts`, W15), so the "raise to 16" fix is moot; only the eyeball check is left. Tune durations in `polish.css` if the draw-in feels slow |
| U13a-1: U13 split into U13a (cloud) and U13b (local) | owner | decide · S | | Recommended: accept; device and GPU checks can't run in a cloud container |
| SB3-1: make `PR body guard / guard` a required check | owner | done | #66 | Ruleset 26262955 "main: required checks" requires `guard`, `test`, `secrets` (repo-admin bypass, PRs only); `ci.yml` runs on every PR so .md-only PRs can merge |
| SB3-2: add "remove any session link the tooling appended to the PR body" to `SESSION-PROTOCOL.md` Finish step 4 | owner | decide · S | | Recommended: yes; every prompt repeats it by hand meanwhile |
| SB3 Open 1: deliberate `Claude-Session:` trailer test of the guard on GitHub | owner | optional · S | | Recommended: skip; unit tests cover the pattern |
| SB4-1: delete logs of guard runs that failed on a session link (run 41174630514 and two on #58) | owner | todo · S | | Actions > run > ⋯ > Delete all logs; the logs still hold the URL |
| W15-2: cursor spotlight | owner | deferred | | Cursor effects are deferred in `CLAUDE.md` Design. If un-deferred: desktop only, off under reduced motion |
| SB3-W15-1: state perf budgets as "≤ +25 % over same-session main" | owner | decide · S | | Recommended: yes; absolute ms budgets drift with the machine |
| Branch clean-up: merged `variant/*` and `claude/*` on origin | owner | done | | Owner deleted them (last: `variant/20261030-sky-wow`); origin holds `main` and this PR's branch. Delete `variant/20261101-qa` after #66 merges |
