# CMP1 carry-over · 2026-11-13
PR: see `docs/carry/README.md` · Branch: `variant/20261113-companion` · Preview: the PR's Cloudflare Pages preview

Mock companion (placeholder): a hooded-seer head with four poses, a launcher and a three-line panel. Art lives only in
`apps/web/src/components/companion/CompanionHead.tsx` plus the `cmp-*` rules in `apps/web/src/styles/companion.css`.

## Checked (previous wave)
- None: a standalone variant, no earlier wave.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | owner | Final look of the head | Brainstorm 4–6 heads side by side (one artifact page), then swap `CompanionHead.tsx` only. |
| 2 | follow-up | next-U | Character line can't show real top fixes: no report is persisted outside `/character` | If wanted, keep the last report's top-3 leads in a local store on import and read them here. |
| 3 | recommendation | next-U | Launcher is fixed bottom-right and can sit over row buttons (e.g. a Quick pick "Set up") while scrolling on phones | Accept for the mock; for the real one, add bottom page padding equal to the launcher. |
| 4 | follow-up | CI | `e2e/companion.spec.ts` not run locally (laptop rule) | Left to CI. |
| 5 | recommendation | next-U | `index.html` is 227 B under its 158,000 br budget after this | Raise the budget with the reason if the companion ships for real. |
