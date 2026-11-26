# pob-engine

Path of Building 2's own calc engine behind a small HTTP API. A pasted PoB code goes in; every stat PoB computes comes out, including the damage of every skill group (a code stores its main group's only). The site uses it to fill what poe.ninja used to supply (`packages/core/src/pob/engine.ts`, provenance `pob-calc`, label "PoB calc").

It runs the pinned PoB2 release in `vendor/pob2` unmodified, through our Lua in `tools/pob2` (`serve.lua` + `groups_lib.lua`, the same code the CI oracle uses). Not a workspace; deployed as a container.

## Why a container, not a Worker

| Option | Verdict |
|---|---|
| **LuaJIT in a container** (chosen) | PoB2 needs LuaJIT built at the commit PoB pins: it uses compound assignment (`x += 1`), `ffi` and `bit`. One worker holds ~700 MB once PoB's data is loaded, starts in ~2.5 s, then takes ~11 s per build (18 groups recalculated). Reproduces the CI oracle byte for byte. |
| Lua compiled to WASM in a Cloudflare Worker | Rejected: stock Lua/wasmoon can't parse PoB2's `+=` or provide `ffi`; and 700 MB resident and ~11 s of CPU per build are far past a Worker's 128 MB and CPU limits. |
| Vercel function (where `ninja-proxy` lives) | Rejected: no LuaJIT runtime, 2.5 s PoB start on every cold start, and the memory/time limits of the plan. |

## API

- `GET /health` → `{ ok, pobVersion, pinCommit, busy }`
- `POST /calc` with `{ "code": "<PoB2 code>" }` (JSON) or the bare code (text) → `{ pobVersion, pinCommit, snapshot, groups, ms, cached }`
  - `snapshot`: `tools/pob2/snapshot.lua`'s shape (`stats`, `fullDpsSkills`, `export`, `loadError`)
  - `groups`: `tools/pob2/groups.lua`'s shape (`{ groups, rows }`, one row per group and active skill)
  - 400 bad code (the reason), 403 browser origin not allowed, 413 code over 256 KB, 422 PoB's own error, 429 rate limit (`Retry-After`), 503 queue full (`Retry-After`)

Answers are cached by the decoded XML's sha256 (LRU, 64). Requests are serialised on one worker; a timeout or crash restarts it, and it is recycled every 200 builds.

## Env

| Var | Default | |
|---|---|---|
| `PORT` | 8080 | |
| `ALLOWED_ORIGIN` | `upgraded-disco-companion.pages.dev` (and previews) + `localhost` | regex source; browsers from any other origin get 403 |
| `CALC_TIMEOUT_MS` | 90000 | per build, and for PoB's start |
| `RATE_LIMIT` | 20 | uncached builds per client per 10 minutes |
| `MAX_QUEUE` | 4 | builds waiting before 503 |
| `CACHE_SIZE` | 64 | |
| `POB_ROOT` | repo root | holds `vendor/pob2` and `tools/pob2` |
| `LUAJIT` | `luajit` | |

## Run

Locally (LuaJIT from `scripts/pob2/install-luajit.sh`): `node services/pob-engine/src/server.mjs`.

Image (build from the repository root; it copies `vendor/pob2` and `tools/pob2`):

```sh
docker build -f services/pob-engine/Dockerfile -t pob-engine .
docker run --rm -p 8080:8080 pob-engine
```

## Deploy (owner queue PE-1, deferred)

Not deployed: the owner chose to leave it off for now (2026-11-26) and rules out anything needing a paid account. Cloud Run and Cloudflare Containers both need billing. A free host that fits the ~700 MB worker is a Hugging Face Space (Docker SDK, free CPU tier, no card, sleeps after 48 h idle). Any host works with the same image: set `NEXT_PUBLIC_POB_ENGINE_BASE` to its https URL in the Pages build env; `apps/web/scripts/csp-hashes.mjs` adds the origin to `connect-src`.

After a PoB bump (`docs/POB2-SYNC.md`), rebuild and redeploy wherever it runs: the image carries `vendor/pob2`.

## Tests

`npm test` here: decode and HTTP behaviour with a fake worker, plus `engine.test.mjs`, which runs the real worker on both reference codes and must equal the committed oracle files (it skips where LuaJIT is not installed). CI job `pob-engine` also builds the image and checks the reference TotalDPS.
