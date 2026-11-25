// node --test: run.mjs helpers and the committed oracle files (no Lua needed; the Lua side runs in CI's pob2-oracle).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inflateSync } from 'node:zlib';
import { isTestsImageRef } from './lib.mjs';
import { FIXTURES, ROOT, canonicalJson, groupsOraclePath, oraclePath, pickRunner, referenceCodes } from './run.mjs';

test('canonicalJson sorts keys at every level and keeps array order', () => {
  const text = canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: null } });
  assert.equal(text, '{\n  "a": {\n    "c": null,\n    "d": [\n      3,\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n');
});

test('referenceCodes lists <name>/code.txt only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pob2-fixtures-'));
  try {
    for (const p of ['b/code.txt', 'a/code.txt', 'a/oracle.json', 'c/other.txt']) {
      mkdirSync(join(dir, p, '..'), { recursive: true });
      writeFileSync(join(dir, p), '');
    }
    assert.deepEqual(referenceCodes(dir), [join(dir, 'a/code.txt'), join(dir, 'b/code.txt')]);
    assert.deepEqual(referenceCodes(join(dir, 'missing')), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(oraclePath('/f/l/code.txt'), '/f/l/oracle.json');
  assert.equal(groupsOraclePath('/f/l/code.txt'), '/f/l/groups.oracle.json');
});

/** A PoB code is url-safe base64 of zlib-deflated XML. */
const decodeCode = (file) =>
  inflateSync(Buffer.from(readFileSync(file, 'utf8').trim().replace(/-/g, '+').replace(/_/g, '/'), 'base64')).toString('utf8');

test('the oracle reproduces every PlayerStat the reference code carries, and the main group equals TotalDPS', () => {
  // The code is the source of truth: the headless run must give back its own numbers (relative 1e-9, i.e. exact
  // up to float printing). A miss here means the engine pin or the runner differs from the PoB that wrote the code.
  for (const code of referenceCodes(FIXTURES)) {
    const xml = decodeCode(code);
    const stats = [...xml.matchAll(/<PlayerStat stat="([^"]+)" value="([^"]+)"/g)];
    assert.ok(stats.length > 0, code);
    const oracle = JSON.parse(readFileSync(oraclePath(code), 'utf8')).export.PlayerStat;
    for (const [, stat, value] of stats) {
      const want = Number(value);
      const got = Number(oracle[stat]);
      assert.ok(Math.abs(got - want) <= Math.abs(want) * 1e-9 + 1e-9, `${code} ${stat}: code ${want}, oracle ${oracle[stat]}`);
    }
    const main = Number(/<Build [^>]*mainSocketGroup="(\d+)"/.exec(xml)[1]);
    const groups = JSON.parse(readFileSync(groupsOraclePath(code), 'utf8'));
    const row = groups.rows.find((r) => r.group === main && r.activeSkill === 1);
    const total = Number(/<PlayerStat stat="TotalDPS" value="([^"]+)"/.exec(xml)[1]);
    assert.ok(Math.abs(row.TotalDPS - total) <= total * 1e-9, `${code} main group ${main}: ${row.TotalDPS} vs code ${total}`);
  }
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

test('every reference code has a canonical oracle from the pinned PoB commit', () => {
  const pin = JSON.parse(readFileSync(join(ROOT, 'vendor', 'pob2', 'PIN.json'), 'utf8'));
  const codes = referenceCodes(FIXTURES);
  assert.ok(codes.length > 0, 'no fixtures under packages/core/test/reference/<name>/');
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

test('every reference code has a canonical groups oracle with a row per <Skill> group', () => {
  const codes = referenceCodes(FIXTURES);
  for (const code of codes) {
    const text = readFileSync(groupsOraclePath(code), 'utf8');
    const oracle = JSON.parse(text);
    assert.equal(text, canonicalJson(oracle), `${groupsOraclePath(code)} is not canonical: run npm run pob2:oracle`);
    assert.ok(oracle.groups > 0, code);
    const groups = [...new Set(oracle.rows.map((r) => r.group))];
    assert.deepEqual(groups, Array.from({ length: oracle.groups }, (_, i) => i + 1), `${code}: a row per group`);
    for (const row of oracle.rows) {
      assert.equal(row.loadError, undefined, `${code} group ${row.group}`);
      assert.equal(typeof row.skill, 'string', `${code} group ${row.group}`);
      assert.equal(typeof row.enabled, 'boolean', `${code} group ${row.group}`);
    }
  }
});

test('groups.lua reuses headless.lua and never writes vendor/pob2', () => {
  // Code lines only: the header comment names vendor/pob2 to say it is left unmodified.
  const lua = readFileSync(join(ROOT, 'tools', 'pob2', 'groups.lua'), 'utf8').split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  assert.match(lua, /dofile\(dir \.\. "\/headless\.lua"\)/);
  assert.doesNotMatch(lua, /io\.open\([^)]*["']w/);
  assert.doesNotMatch(lua, /vendor/);
});
