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
| 6 | A6 SEO, landmarks, CI | Cloud | Sonnet 5.5 · medium | todo | | | | tracked in docs/audit/08-PROGRESS.md |
| 6 | U12 installable app | Cloud | Sonnet 5.5 · high | done | variant/20261029-pwa | #31 | https://variant-20261029-pwa.upgraded-disco-companion.pages.dev | Update toast, offline chip and install button built; chip and button unmounted (U6, U7); manifest shortcuts |
| 7 | A7 design tokens | Local | Opus 5.5 · high | todo | | | | tracked in docs/audit/08-PROGRESS.md |
| 7 | A8 proxy CORS | Cloud | Sonnet 5.5 · medium | todo | | | | tracked in docs/audit/08-PROGRESS.md |
| 8 | U2 surfaces and connectors | Local | Opus 5.5 · high | todo | | | | |
| 9a | U3 typography and labels | Cloud | Sonnet 5.5 · medium | todo | | | | |
| 9b | U4 controls kit | Local | Opus 5.5 · high | todo | | | | After U3 |
| 10 | U5 segmented gauge | Cloud | Sonnet 5.5 · medium | todo | | | | |
| 10 | U6 phone tab bar | Local | Sonnet 5.5 · high | todo | | | | After A6 |
| 11 | U7 full footer | Cloud | Sonnet 5.5 · medium | todo | | | | U7: needs U6, U9, U12 |
| 12 | U10 character page | Local | Opus 5.5 · high | todo | | | | |
| 12 | U11a checklist | Cloud | Sonnet 5.5 · medium | todo | | | | |
| 13 | U11b dashboard and atlas | Cloud | Sonnet 5.5 · medium | todo | | | | |
| 14 | U13 final QA | Local | Opus 5.5 · high | todo | | | | Final QA, local |

## Backlog
