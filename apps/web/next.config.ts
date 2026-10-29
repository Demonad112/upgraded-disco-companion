import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextConfig } from 'next'

/**
 * Static export, deployed on Cloudflare Pages.
 *
 * `basePath` is applied only under GitHub Actions, so it is empty locally and on
 * Cloudflare Pages (served from the domain root). It is DERIVED from
 * `GITHUB_REPOSITORY` rather than written out: both projects this repo merges
 * hardcoded their own repo name here, and this one's name is long enough that
 * renaming it is plausible. Deriving it means a rename needs no code change,
 * and a wrong value can never silently ship — the assets simply resolve
 * against whatever repository actually built them.
 *
 * `NEXT_PUBLIC_BASE_PATH` is re-exported because Next only inlines
 * `process.env` into client bundles for `NEXT_PUBLIC_`-prefixed names. A
 * client component reading `GITHUB_ACTIONS` directly gets `undefined` and
 * builds root-relative URLs that 404 in production.
 *
 * There are no API routes by design: a static export has nothing to run them.
 * The poe.ninja fetch goes through services/ninja-proxy instead, because
 * poe.ninja sends no CORS headers and 405s preflight — a browser cannot call
 * it directly. See services/ninja-proxy/README.md.
 */
const isCI = process.env.GITHUB_ACTIONS === 'true'
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const basePath = isCI && repo ? `/${repo}` : ''

/**
 * A fingerprint of every data file the site ships.
 *
 * The service worker keys its caches on this, so a deploy that regenerates any
 * of them installs a new worker and drops the old copies. With a hand-set
 * version, returning visitors kept stale data until someone remembered to bump
 * it. The atlas tree, bases and PoB skills are fetched network-first today, so
 * they would refresh anyway; they are hashed too so that a later switch to
 * cache-first can't quietly serve an old patch. Keep this list in step with
 * scripts/sync-data.mjs.
 */
const dataVersion = (() => {
  const hash = createHash('sha1')
  for (const file of ['passive-tree.json', 'mod-tiers.json', 'monster-stats.json', 'atlas-tree.json', 'bases.json', 'pob-skills.json']) {
    hash.update(readFileSync(join(__dirname, '..', '..', 'packages', 'data', 'generated', file)))
  }
  return hash.digest('hex').slice(0, 12)
})()

/**
 * Identifies this build, so the service worker can key the app-shell cache on
 * it. Without this, a code-only deploy kept the old shell cache name and an
 * offline visitor could get old HTML pointing at chunks that no longer exist.
 * The commit SHA on Pages and Actions; the build time anywhere else.
 */
const buildId = (process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? String(Date.now())).slice(0, 12)

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_DATA_VERSION: dataVersion, NEXT_PUBLIC_BUILD_ID: buildId },
}

export default nextConfig
