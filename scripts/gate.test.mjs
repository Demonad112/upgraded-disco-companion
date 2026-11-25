import test from 'node:test';
import assert from 'node:assert/strict';
import { plan } from './gate.mjs';

test('docs only runs nothing', () => assert.deepEqual(plan(['docs/HISTORY.md', 'CLAUDE.md']), []));
test('core test change runs core checks once, no web build', () => {
  const c = plan(['packages/core/test/a.test.ts']);
  assert.ok(c.includes('npm run test:coverage -w @poe2/core'));
  assert.ok(!c.includes('npm run test -w @poe2/core'));
  assert.ok(!c.includes('npm run build -w @poe2/web'));
});
test('core lint runs with --if-present: core has no lint script', () => {
  const c = plan(['packages/core/test/a.test.ts']);
  assert.ok(c.includes('npm run lint -w @poe2/core --if-present'));
  assert.ok(!c.includes('npm run lint -w @poe2/core'));
});

test('core src change adds web tests, build and route weight', () => {
  const c = plan(['packages/core/src/x.ts']);
  assert.ok(c.includes('npm run test -w @poe2/web') && c.includes('node scripts/route-weight.mjs'));
});
test('pob paths add the oracle check', () => assert.ok(plan(['tools/pob2/a.lua']).includes('npm run pob2:oracle -- --check')));
test('web e2e only runs no build', () => assert.ok(!plan(['apps/web/e2e/a.spec.ts']).includes('npm run build -w @poe2/web')));
test('dependency change runs check:all', () => assert.deepEqual(plan(['apps/web/package.json']), ['npm run check:all']));
test('core src and reference changes run the decoded-reference drift check', () => {
  assert.ok(plan(['packages/core/src/x.ts']).includes('npm run decode:reference -- --check'));
  assert.ok(plan(['packages/core/test/reference/pob2-own/code.txt']).includes('npm run decode:reference -- --check'));
  assert.ok(!plan(['apps/web/e2e/a.spec.ts']).includes('npm run decode:reference -- --check'));
});
