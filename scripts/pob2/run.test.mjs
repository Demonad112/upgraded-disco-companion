// node --test: run.mjs helpers and the committed oracle files (no Lua needed; the Lua side runs in CI's pob2-oracle).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { isTestsImageRef } from './lib.mjs';
import { FIXTURES, ROOT, canonicalJson, currentLeagueCodes, oraclePath, pickRunner } from './run.mjs';

test('canonicalJson sorts keys at every level and keeps array order', () => {
  const text = canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: null } });
  assert.equal(text, '{\n  "a": {\n    "c": null,\n    "d": [\n      3,\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n');
});

test('currentLeagueCodes lists <league>/*.code.txt and skips archive/', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pob2-fixtures-'));
  try {
    for (const p of ['b-league/x.code.txt', 'a-league/y.code.txt', 'a-league/y.oracle.json', 'archive/old/z.code.txt']) {
      mkdirSync(join(dir, p, '..'), { recursive: true });
      writeFileSync(join(dir, p), '');
    }
    assert.deepEqual(currentLeagueCodes(dir), [join(dir, 'a-league/y.code.txt'), join(dir, 'b-league/x.code.txt')]);
    assert.deepEqual(currentLeagueCodes(join(dir, 'missing')), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(oraclePath('/f/l/a.code.txt'), '/f/l/a.oracle.json');
});

test('pickRunner honours POB2_RUNNER and rejects other values', () => {
  assert.equal(pickRunner('docker'), 'docker');
  assert.equal(pickRunner('luajit'), 'luajit');
  assert.throws(() => pickRunner('lua5.4'), /POB2_RUNNER/);
});

test('PIN.json pins PoB tests image by digest', () => {
  const pin = JSON.parse(readFileSync(join(ROOT, 'vendor', 'pob2', 'PIN.json'), 'utf8'));
  assert.ok(isTestsImageRef(pin.testsImage), pin.testsImage);
  assert.equal(isTestsImageRef('ghcr.io/x/y:latest'), false);
  assert.equal(isTestsImageRef(`ghcr.io/x/y@sha256:${'a'.repeat(63)}`), false);
});

test('every current-league code has a canonical oracle from the pinned PoB commit', () => {
  const pin = JSON.parse(readFileSync(join(ROOT, 'vendor', 'pob2', 'PIN.json'), 'utf8'));
  const codes = currentLeagueCodes(FIXTURES);
  assert.ok(codes.length > 0, 'no fixtures under packages/core/test/pob2/<league>/');
  for (const code of codes) {
    const text = readFileSync(oraclePath(code), 'utf8');
    const oracle = JSON.parse(text);
    assert.equal(text, canonicalJson(oracle), `${oraclePath(code)} is not canonical: run npm run pob2:oracle`);
    assert.equal(oracle.loadError, null, code);
    assert.equal(oracle.pinCommit, pin.commit, `${oraclePath(code)} predates PIN ${pin.commit}: run npm run pob2:oracle`);
    assert.equal(oracle.pobVersion, pin.manifestVersion, code);
    assert.equal(typeof oracle.stats.Life, 'number', code);
  }
});
