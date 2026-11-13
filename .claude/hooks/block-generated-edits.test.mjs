import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isGenerated } from './block-generated-edits.mjs';

const hook = fileURLToPath(new URL('./block-generated-edits.mjs', import.meta.url));
const run = (tool_name, file_path) =>
  spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_name, tool_input: { file_path } }), encoding: 'utf8' });

test('blocks generated paths, incl. Windows backslashes', () => {
  for (const p of [
    'packages/data/generated/bases.json',
    'C:\\repo\\packages\\data\\generated\\mod-tiers.json',
    '/repo/apps/mcp/TOOLS.md',
    'C:\\repo\\apps\\web\\out\\index.html',
    '/repo/apps/web/public/passive-tree.json',
    'C:\\repo\\apps\\web\\public\\trade-map.json',
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
    '/repo/apps/mcp/README.md',
  ]) {
    assert.equal(isGenerated(p), false, p);
    assert.equal(run('Write', p).status, 0, p);
  }
});
