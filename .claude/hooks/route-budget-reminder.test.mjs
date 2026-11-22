import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('./route-budget-reminder.mjs', import.meta.url));
const run = (input) => spawnSync(process.execPath, [hook], { input, encoding: 'utf8' });

test('core source edit emits the route budget additionalContext', () => {
  const r = run(JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'packages/core/src/a.ts' } }));
  assert.equal(r.status, 0);
  const lines = r.stdout.trim().split('\n');
  assert.equal(lines.length, 1);
  const out = JSON.parse(lines[0]);
  assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(out.hookSpecificOutput.additionalContext, /node scripts\/route-weight\.mjs/);
});

test('docs edit emits nothing', () => {
  const r = run(JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'docs/x.md' } }));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('invalid stdin emits nothing and exits 0', () => {
  const r = run('not json {');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});
