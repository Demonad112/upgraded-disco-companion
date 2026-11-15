# WQA3 scroll harness

Playwright + CDP harness behind `docs/carry/WQA3.md`. Run from this folder with the preinstalled Chromium (`require('playwright')`), not the workspace's pinned Playwright.

```bash
node scroll-audit.cjs <base> phone|desktop <variant> <route> [touch|wheel|toolbar|idle] [out.jsonl]
# variants: sky dimoff rm nosky noastro noskyastro nograin noshadow bare
# key fields: p50 p95 over16 (% frames > 16.7 ms), skyPaintsWhileScrolling, mainMs.Commit/Paint, worstLoaf
./matrix.sh                     # full matrix (live + http://localhost:4321 from apps/web/e2e/serve.mjs), ~45 min
node summarize.cjs out.jsonl    # markdown table
node freeze.cjs                 # resize mid-scroll, then counts idle sky paints (0 = frozen sky)
node cls.cjs <url> phone|desktop [rm]   # layout-shift sources
```
`freeze.cjs` and `cls.cjs` point at the live site; pass or edit the URL to test a preview.
