# Vendored fonts

Loaded by `next/font/local` in `../layout.tsx`. Vendored so `next build` makes no request to Google Fonts: with
`next/font/google`, Turbopack downloads every font file from `fonts.gstatic.com` during the build, and one failed
download fails the whole build ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'"). That broke CI
on PR #53 (Geist Mono) and cloud-session builds (carry item U3-4).

| File | Family | Source | Weights used | Licence |
|---|---|---|---|---|
| `eb-garamond-latin.woff2` | EB Garamond (variable) | Google Fonts, `latin` subset | 500, 600, 700 | SIL OFL 1.1, `OFL-EBGaramond.txt` |
| `inter-latin.woff2` | Inter (variable, wght 400–600) | Google Fonts, `latin` subset | 400, 500, 600 | SIL OFL 1.1, `OFL-Inter.txt` |
| `geist-mono-latin.woff2` | Geist Mono (variable, wght 400–500) | Google Fonts, `latin` subset | 400, 500 | SIL OFL 1.1, `OFL-GeistMono.txt` |

These are the same files `next/font/google` served on 2026-10-30 (`subsets: ['latin']`, the preloaded subset); the
build output had one file per family covering every weight. The `latin` range is U+0000–00FF plus common punctuation
(U+2000–206F, €, ™, …). Characters outside it (Greek, Cyrillic, Vietnamese, latin-ext) were in separate on-demand
files before and now use the fallback font.

To update: request `https://fonts.googleapis.com/css2?family=<Family>:wght@<weights>&display=swap` with a modern
browser User-Agent, download the `/* latin */` block's `src` URL, and replace the file here.

Inter and Geist Mono have their weight axis cut to the weights in use (2026-11-16, -27 % and -33 %):
`fonttools varLib.instancer <in>.woff2 wght=400:600 -o out.ttf` (Geist Mono `wght=400:500`), then save as woff2.
Redo this after an update. EB Garamond gains only 1.4 % from the same cut, so it stays whole. Using a weight outside
the range now renders the nearest weight in it.
