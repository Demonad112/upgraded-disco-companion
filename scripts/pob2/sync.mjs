// npm run pob2:sync -- [--commit <sha>] [--tests-image <ref@sha256:…>]   (default: head of the fork's dev branch)
// Shallow-fetches Demonad112/PathOfBuilding-PoE2, copies the calc-relevant subset byte-identical into vendor/pob2/
// and writes vendor/pob2/PIN.json. This is the only writer of vendor/pob2. Never commits to the fork.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BRANCH, PIN_NAME, REPO_URL, VENDOR_DIR, hashFiles, isTestsImageRef, isVendored, latestTreeVersion,
  manifestVersion,
} from './lib.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const wanted = arg('--commit');
if (wanted !== undefined && !/^[0-9a-f]{7,40}$/i.test(wanted)) {
  console.error('--commit needs a hex sha (7-40 chars).');
  process.exit(2);
}
// PoB's tests Docker image (LuaJIT + luautf8 + busted), pinned by digest. Kept across syncs; --tests-image replaces it.
let testsImage = arg('--tests-image');
if (testsImage === undefined) {
  try {
    testsImage = JSON.parse(readFileSync(join(VENDOR_DIR, PIN_NAME), 'utf8')).testsImage;
  } catch {
    testsImage = undefined;
  }
}
if (!isTestsImageRef(testsImage)) {
  console.error('PIN.json needs testsImage as <image>@sha256:<64 hex>; pass --tests-image.');
  process.exit(2);
}

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', ...args], {
    cwd, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

const work = mkdtempSync(join(process.env.POB2_SYNC_TMP ?? tmpdir(), 'pob2-sync-'));
try {
  git(work, 'init', '-q');
  git(work, 'remote', 'add', 'origin', REPO_URL);
  // blobless + depth 1: only the files we check out are downloaded.
  git(work, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', wanted ?? BRANCH);
  const commit = git(work, 'rev-parse', 'FETCH_HEAD');
  const commitDate = git(work, 'show', '-s', '--format=%cI', commit);

  const rels = git(work, 'ls-tree', '-r', '--name-only', commit).split('\n').filter(isVendored);
  if (!rels.length) throw new Error('no vendorable files found');
  writeFileSync(join(work, 'paths.txt'), rels.join('\0'));
  git(work, 'checkout', '-q', commit, '--pathspec-from-file=paths.txt', '--pathspec-file-nul');

  // Replace vendor/pob2 wholesale (PIN.json is rewritten below).
  rmSync(VENDOR_DIR, { recursive: true, force: true });
  for (const r of rels) {
    mkdirSync(join(VENDOR_DIR, r, '..'), { recursive: true });
    cpSync(join(work, r), join(VENDOR_DIR, r));
  }

  const pin = {
    repo: REPO_URL.replace('https://github.com/', ''),
    branch: BRANCH,
    commit,
    commitDate,
    manifestVersion: manifestVersion(readFileSync(join(VENDOR_DIR, 'manifest.xml'), 'utf8')),
    latestTreeVersion: latestTreeVersion(readFileSync(join(VENDOR_DIR, 'src/GameVersions.lua'), 'utf8')),
    testsImage,
    files: hashFiles(VENDOR_DIR, rels),
  };
  writeFileSync(join(VENDOR_DIR, PIN_NAME), JSON.stringify(pin, null, 2) + '\n');
  console.log(`pob2:sync ${pin.repo}@${commit.slice(0, 9)} (${pin.commitDate}) v${pin.manifestVersion}, tree ${pin.latestTreeVersion}, ${rels.length} files`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
