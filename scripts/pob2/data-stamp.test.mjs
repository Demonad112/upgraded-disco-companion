// node --test: the generated data is stamped from vendor/pob2/PIN.json, never by hand (needs no Lua).
// A PoB bump that moves PIN.json without rebuilding the data (npm run build:pob -w @poe2/data) fails here.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pin, pobCommitShort, pobSource } from '../../packages/data/scripts/lib/pob.mjs';
import { GAME_PATCH, POB_ARTIFACTS, writeDataVersion } from '../../packages/data/scripts/lib/version.mjs';
import { EXPORTS, ROOT, exportData } from './run.mjs';

const generated = (name) => join(ROOT, 'packages', 'data', 'generated', name);
const read = (name) => JSON.parse(readFileSync(generated(name), 'utf8'));

test('exportData rejects a name that has no exporter', () => {
  assert.deepEqual(EXPORTS, ['mods', 'bases', 'skills', 'tree', 'constants']);
  assert.throws(() => exportData('nope', 'luajit'), /unknown export "nope"/);
});

test('version.json is exactly what PIN.json produces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'data-version-'));
  try {
    const written = writeDataVersion(dir);
    assert.deepEqual(read('version.json'), written);
    assert.equal(written.dataRevision, `${GAME_PATCH}@${pin.commit.slice(0, 7)}`);
    assert.equal(written.extractedAt, pin.commitDate.slice(0, 10));
    assert.equal(written.pobCommit, pin.commit);
    assert.equal(written.pobVersion, pin.manifestVersion);
    assert.equal(written.treeVersion, pin.latestTreeVersion);
    assert.deepEqual(written.artifacts, POB_ARTIFACTS);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the game patch label extends the tree version PoB ships', () => {
  assert.ok(GAME_PATCH.startsWith(`${pin.latestTreeVersion.replace('_', '.')}.`) || GAME_PATCH === pin.latestTreeVersion.replace('_', '.'));
});

test('every PoB-built artifact names the pinned commit', () => {
  assert.match(read('mod-tiers.json').generatedFrom[0], new RegExp(`^${pobSource} `));
  assert.match(read('bases.json').generatedFrom, new RegExp(`^${pobSource} `));
  assert.equal(read('pob-skills.json').source.commit, pin.commit);
  const tree = read('passive-tree.json');
  assert.equal(tree.treeName, `PassiveTree-${pin.latestTreeVersion.replace('_', '.')}@${pobCommitShort}`);
  assert.match(tree.generatedFrom, new RegExp(`^${pobSource} `));
});
