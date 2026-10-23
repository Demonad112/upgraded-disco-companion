# 09 — Owner decisions

Each item has my recommendation first, then the tradeoff. The implementing session stops at tasks marked ⛔ until the
matching decision below is recorded (edit the **Decision** line).

**Status 2026-10-22:** the owner accepted every recommendation (D1–D10). No ⛔ task is blocked on a decision.

### D1 — Chat CSP (SEC-01, T02)
**Recommend A: allow the three provider origins in `connect-src`.** The chat is deliberately bring-your-own-key, the key lives
in `sessionStorage`, and the request goes from the user's browser straight to the provider they picked. Opening `connect-src`
to three well-known API hosts adds little risk: an XSS could already exfiltrate to `'self'`-hosted paths, and there's no XSS sink.
B: hide direct mode unless `NEXT_PUBLIC_CHAT_PROXY_BASE` is set. Tighter CSP, but no chat for anyone until you host a chat proxy.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). A: allow the three provider origins in connect-src

### D2 — Sky dim via CSS instead of canvas (SKY-01, T05) ⛔
**Recommend yes.** The pixels are mathematically identical (derivation in `01-FINDINGS.md` SKY-01), the scroll lag goes away,
and the per-frame layout reads disappear. T05 gates on a screenshot match (≤ 0.2% pixels) before and after, with dim on and off.
Tradeoff: it touches the implementation of a decided design element. Targets with their own background need care (T05 step 3).
If the screenshots don't match, the task stops.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Yes: dim via CSS, gated on the T05 screenshot match

### D3 — Quantised twinkle to batch star draws (SKY-03, T07) ⛔
**Recommend yes, with 8 alpha levels.** It cuts about 1,000 fills per frame to about 24, and 8 levels on stars of 0.35–1.75 px
is below what the eye resolves at 30 fps. Tradeoff: twinkle becomes stepped in theory. If you can see it, raise it to 16 levels
(still about 48 fills). Alternative: an offscreen pre-rendered field, about 47 MB on a retina laptop, so not recommended.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Yes: 8 alpha levels (raise to 16 if stepping is visible)

### D4 — Dependabot (DX-01, T12) ⛔
**Recommend yes, grouped and weekly, max 5 open PRs.** Without it, advisories reach you only via Next's build gate (as happened
here). Tradeoff: PR noise, and your rule that every bump PR gets a full local build and type-check before merge (CI already
runs typecheck, build and e2e on each PR). The `npm audit --omit=dev --audit-level=high` CI step lands either way.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Yes: Dependabot grouped, weekly, max 5 open PRs, plus the CI audit step

### D5 — Variant strategy and screenshots (06, ARCH-01/03, T19) ⛔
**Recommend branch-per-variant with Pages preview URLs, plus T19 (tokens.css).** Keep verification screenshots out of git
from now on. Leave existing PNGs in place: removing them saves nothing in history without a rewrite, and history rewrites are
off the table. Tradeoff: variants live on branches, not as folders you can open side by side locally. Use two preview URLs instead.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Branch-per-variant with Pages previews; do T19 (tokens.css); keep new screenshots out of git; no history rewrite

### D6 — robots.txt and sitemap (SEO-01)
**Recommend: keep Cloudflare's managed robots.txt, add `sitemap.xml` via T15, and add a `Sitemap:` line only if you take
robots.txt into the repo.** Today's robots.txt is Cloudflare's "content signals" text (an AI-use policy you or the zone set).
An in-repo `robots.txt` might interact with that managed file. Check the Cloudflare setting before adding one.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Keep Cloudflare managed robots.txt; add sitemap.xml via T15; no in-repo robots.txt

### D7 — Repo `CLAUDE.md` additions (CLAUDE.md exists, so it isn't overwritten)
**Recommend applying this diff** (T21):

```diff
@@ ## Architecture
 - Web state is client-side only (`localStorage`); reference content lives in hand-edited files in `apps/web/src/data/`.
+
+## Design (decided, do not change without the owner)
+
+Dark palette; bold uppercase EB Garamond headings; sharp gothic-medieval feel (square corners everywhere,
+no script fonts, no rounded/bubble shapes); gold constellation sky rotating slowly; clear-glass see-through
+blocks; Threads-style tool cards; sky dimmed behind blocks with an on/off toggle (footer, `poe2-sky-dim`);
+lighter sky on phones (width-based); "Up next" block kept. Light theme and cursor effects are deferred.
+
+- Never edit the live design directly. Design variants go on `variant/<yyyymmdd>-<slug>` branches and are
+  reviewed on their Cloudflare Pages preview URL (see `docs/audit/06-VARIANT-STRATEGY.md`).
+- Tokens live in `:root` (`apps/web/src/app/globals.css`, or `tokens.css` once split). Prefer tokens over hex in components.
+
+## Cloudflare Pages
+
+- Build `npm run build`, output `apps/web/out`, Node 22. No Functions, no wrangler config; headers in `apps/web/public/_headers`.
+- Any new fetch origin must be added to `connect-src` there (`apps/web/test/headers.test.ts` enforces it).
+- Local parity check: `npx wrangler@4 pages dev apps/web/out`.
+
+## Audit
+
+`docs/audit/` holds the 2026-10-22 audit; `docs/audit/08-PROGRESS.md` tracks fix tasks.
```
Tradeoff: none of substance. It adds about 20 lines to a file loaded every session.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Apply the CLAUDE.md diff above (T21)

### D8 — Restrict ninja-proxy CORS (SEC-02, T20) ⛔
**Recommend yes**, an allowlist of production, `*.upgraded-disco-companion.pages.dev` previews and localhost. It stops third-party
sites from spending your Vercel quota and poe.ninja goodwill. Tradeoff: any future custom domain must be added, and the
proxy deploys separately on Vercel (your step). Alternative: a Vercel Firewall rate-limit rule with no code change.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Yes: allowlist CORS (production, pages.dev previews, localhost); owner deploys on Vercel

### D9 — HSTS before a custom domain (SEC-04)
**Recommend removing `includeSubDomains`** from `_headers` *before* attaching a custom apex domain, unless every subdomain
of that domain is HTTPS-only. No action while on `pages.dev`. Don't add `preload`.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Remove includeSubDomains before attaching a custom domain; no action while on pages.dev; no preload

### D10 — Which branch receives the fixes
**Recommend: a fresh branch per task (or per phase) off `main`, not `ui/glass-refresh`.** `ui/glass-refresh` has uncommitted
design work (`globals.css`, `page.tsx`, `DefensePanel.tsx`), so fixes shouldn't mix with it. Tradeoff: T05/T06/T07/T08 touch
`ConstellationSky.tsx` and `globals.css`, so if `ui/glass-refresh` merges later it may conflict. Land the glass branch first if it's close.
**Decision:** Accepted 2026-10-22 (owner accepted all recommendations). Fresh branch per phase off main (fix/audit-p0 … fix/audit-p3); never ui/glass-refresh
