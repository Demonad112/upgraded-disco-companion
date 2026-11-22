import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isGenerated, isLockfile, wantsE2eReminder } from './block-generated-edits.mjs';

const hook = fileURLToPath(new URL('./block-generated-edits.mjs', import.meta.url));
const run = (tool_name, file_path) =>
  spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_name, tool_input: { file_path } }), encoding: 'utf8' });

test('blocks generated paths, incl. Windows backslashes', () => {
  for (const p of [
    'packages/data/generated/bases.json',
    'C:\\repo\\packages\\data\\generated\\mod-tiers.json',
    'C:\\repo\\apps\\web\\out\\index.html',
    '/repo/apps/web/public/passive-tree.json',
    'C:\\repo\\apps\\web\\public\\trade-map.json',
    'vendor/pob2/src/Modules/Build.lua',
    '/repo/vendor/pob2/PIN.json',
    'C:\\repo\\vendor\\pob2\\runtime\\lua\\dkjson.lua',
    'packages/core/test/pob2/forbidden-rites/main.oracle.json',
    'C:\\repo\\packages\\core\\test\\pob2\\archive\\old\\x.oracle.json',
  ]) {
    assert.equal(isGenerated(p), true, p);
    const r = run('Edit', p);
    assert.equal(r.status, 2, p);
    assert.match(r.stderr, /Generated file/);
  }
});

test('allows source paths', () => {
  for (const p of [
    'packages/core/src/index.ts',
    'C:\\repo\\apps\\web\\src\\app\\page.tsx',
    '/repo/apps/web/public/_headers',
    '/repo/apps/web/public/manifest.json',
    '/repo/packages/data/scripts/build-bases.mjs',
    '/repo/packages/data/trade2-stats.json',
    '/repo/apps/mcp/TOOLS.md',
    '/repo/tools/pob2/snapshot.lua',
    '/repo/scripts/pob2/sync.mjs',
    '/repo/packages/core/test/pob2/forbidden-rites/main.code.txt',
    '/repo/packages/core/test/golden/x.expected.json',
  ]) {
    assert.equal(isGenerated(p), false, p);
    assert.equal(run('Write', p).status, 0, p);
  }
});

test('blocks package-lock.json edits', () => {
  for (const p of ['package-lock.json', 'C:\\repo\\package-lock.json', '/repo/services/ninja-proxy/package-lock.json']) {
    assert.equal(isLockfile(p), true, p);
    const r = run('Write', p);
    assert.equal(r.status, 2, p);
    assert.match(r.stderr, /package-lock/);
  }
  assert.equal(isLockfile('/repo/package.json'), false);
});

test('reminds about e2e specs for data edits without blocking', () => {
  for (const p of ['apps/web/src/data/farm/x.json', 'C:\\repo\\packages\\data\\scripts\\build-bases.mjs']) {
    assert.equal(wantsE2eReminder(p), true, p);
    const r = run('Edit', p);
    assert.equal(r.status, 0, p);
    assert.match(r.stdout, /apps\/web\/e2e/);
  }
  assert.equal(wantsE2eReminder('/repo/apps/web/src/app/page.tsx'), false);
});
