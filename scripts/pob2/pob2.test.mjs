import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { diffAgainstPin, hashFiles, isVendored, latestTreeVersion, manifestVersion, walk } from './lib.mjs';

test('isVendored keeps the calc subset and drops art and binaries', () => {
  for (const p of [
    'src/Launch.lua', 'src/Modules/Build.lua', 'src/Classes/Item.lua', 'src/Data/Skills/act_str.lua',
    'src/Data/ModCache.lua', 'src/TreeData/0_5/tree.lua', 'src/TreeData/legion/tree-legion.lua',
    'runtime/lua/dkjson.lua', 'runtime/lua/sha1/init.lua', 'manifest.xml', 'changelog.txt', 'LICENSE.md',
  ]) assert.equal(isVendored(p), true, p);
  for (const p of [
    'src/Assets/x.png', 'src/Data/Foo.dds.zst', 'src/Data/Bar.json', 'src/TreeData/0_5/skills.png',
    'src/TreeData/0_5/other.lua', 'src/TreeData/legion/x.jpg', 'src/Export/a.lua', 'runtime/SimpleGraphic.dll',
    'runtime/Path{space}.exe', 'README.md', 'src/sub/x.lua', 'spec/a.lua', 'tests/b.lua',
  ]) assert.equal(isVendored(p), false, p);
});

test('manifestVersion and latestTreeVersion parse PoB sources', () => {
  assert.equal(manifestVersion('<PoBVersion>\n\t<Version number="0.23.1" />'), '0.23.1');
  assert.equal(latestTreeVersion('treeVersionList = { "0_1", "0_2", "0_5" }\nx = {"9"}'), '0_5');
  assert.equal(latestTreeVersion('nothing'), null);
});

test('diffAgainstPin reports mismatched, missing and extra files', () => {
  const d = mkdtempSync(join(tmpdir(), 'pob2-test-'));
  try {
    mkdirSync(join(d, 'src'), { recursive: true });
    writeFileSync(join(d, 'src/a.lua'), 'a');
    writeFileSync(join(d, 'src/b.lua'), 'b');
    const pin = { files: hashFiles(d, walk(d)) };
    writeFileSync(join(d, 'PIN.json'), '{}');
    assert.deepEqual(diffAgainstPin(d, pin), { mismatched: [], missing: [], extra: [] });
    writeFileSync(join(d, 'src/a.lua'), 'changed');
    rmSync(join(d, 'src/b.lua'));
    writeFileSync(join(d, 'src/c.lua'), 'c');
    assert.deepEqual(diffAgainstPin(d, pin), { mismatched: ['src/a.lua'], missing: ['src/b.lua'], extra: ['src/c.lua'] });
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('the committed vendor/pob2 matches its PIN (verify.mjs exits 0)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./verify.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /pob2:verify ok/);
});
