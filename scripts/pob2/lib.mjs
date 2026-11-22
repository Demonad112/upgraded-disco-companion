// Shared by sync.mjs and verify.mjs. Node built-ins only.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_URL = 'https://github.com/Demonad112/PathOfBuilding-PoE2';
export const BRANCH = 'dev';
export const VENDOR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'vendor', 'pob2');
export const PIN_NAME = 'PIN.json';

// The calc-relevant subset of PoB2. Anything else (images, .dds.zst, Export/, exe/dll) is never copied.
const RULES = [
  /^src\/[^/]+\.lua$/,
  /^src\/Modules\//,
  /^src\/Classes\//,
  /^src\/Data\/.+\.lua$/,
  /^src\/TreeData\/[^/]+\/tree\.lua$/,
  /^src\/TreeData\/legion\/[^/]+\.lua$/,
  /^runtime\/lua\//,
  /^(manifest\.xml|changelog\.txt|LICENSE\.md)$/,
];

/** True when a repo-relative POSIX path belongs in vendor/pob2. */
export const isVendored = (rel) => RULES.some((r) => r.test(rel));

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** All files under dir as sorted repo-relative POSIX paths. */
export function walk(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(p.slice(base.length + 1).replace(/\\/g, '/'));
  }
  return out.sort();
}

export const hashFiles = (dir, rels) =>
  Object.fromEntries(rels.map((r) => [r, sha256(readFileSync(join(dir, r)))]));

export const manifestVersion = (xml) => /<Version\s+number="([^"]+)"/.exec(xml)?.[1] ?? null;

/** Last entry of treeVersionList in src/GameVersions.lua (what PoB calls latestTreeVersion). */
export function latestTreeVersion(lua) {
  const m = /treeVersionList\s*=\s*\{([^}]*)\}/.exec(lua);
  const all = m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  return all.at(-1) ?? null;
}

/** Compare a directory against PIN.json's hashes. Returns { mismatched, missing, extra }. */
export function diffAgainstPin(dir, pin) {
  const have = new Set(walk(dir).filter((r) => r !== PIN_NAME));
  const want = Object.keys(pin.files);
  const missing = want.filter((r) => !have.has(r));
  const extra = [...have].filter((r) => !(r in pin.files));
  const mismatched = want.filter((r) => have.has(r) && sha256(readFileSync(join(dir, r))) !== pin.files[r]);
  return { mismatched, missing, extra };
}
