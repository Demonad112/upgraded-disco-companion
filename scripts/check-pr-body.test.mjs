import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = fileURLToPath(new URL('./check-pr-body.mjs', import.meta.url));

function run(env) {
  const clean = { ...process.env };
  delete clean.PR_TITLE;
  delete clean.PR_BODY;
  delete clean.GITHUB_EVENT_PATH;
  return spawnSync(process.execPath, [script], { env: { ...clean, ...env }, encoding: 'utf8' });
}

test('clean title and body pass', () => {
  const r = run({ PR_TITLE: 'Add a guard', PR_BODY: '## Summary\nNothing odd here.' });
  assert.equal(r.status, 0);
});

test('session URL in body fails', () => {
  const r = run({ PR_TITLE: 'x', PR_BODY: 'done\n\nhttps://claude.ai/code/session_abc123' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /body:/);
  assert.match(r.stderr, /Delete that line/);
});

test('Claude-Session trailer in body fails', () => {
  const r = run({ PR_TITLE: 'x', PR_BODY: 'text\nClaude-Session: abc' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Claude-Session/);
});

test('session URL in title fails', () => {
  const r = run({ PR_TITLE: 'Fix https://claude.ai/code/session_abc', PR_BODY: 'ok' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /title:/);
});

test('match is case-insensitive', () => {
  assert.equal(run({ PR_TITLE: 'x', PR_BODY: 'CLAUDE.AI/CODE/SESSION_1' }).status, 1);
  assert.equal(run({ PR_TITLE: 'x', PR_BODY: 'claude-session: 1' }).status, 1);
});

test('trailer must start a line', () => {
  assert.equal(run({ PR_TITLE: 'x', PR_BODY: 'mentions Claude-Session: in prose' }).status, 0);
});

test('empty body passes', () => {
  assert.equal(run({ PR_TITLE: 'x', PR_BODY: '' }).status, 0);
});

test('missing/null body passes (GitHub sends null for an empty body)', () => {
  assert.equal(run({ PR_TITLE: 'x' }).status, 0);
  assert.equal(run({}).status, 0);
});

function eventFile(pull_request) {
  const path = join(mkdtempSync(join(tmpdir(), 'pr-body-')), 'event.json');
  writeFileSync(path, JSON.stringify({ pull_request }));
  return path;
}

test('reads title and body from GITHUB_EVENT_PATH when no env override', () => {
  assert.equal(run({ GITHUB_EVENT_PATH: eventFile({ title: 'x', body: 'ok' }) }).status, 0);
  const r = run({ GITHUB_EVENT_PATH: eventFile({ title: 'x', body: 'https://claude.ai/code/session_abc' }) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /body:/);
});

test('null body in the event payload passes', () => {
  assert.equal(run({ GITHUB_EVENT_PATH: eventFile({ title: 'x', body: null }) }).status, 0);
});

test('a hit never echoes the matched text', () => {
  const r = run({ PR_TITLE: 'x', PR_BODY: 'https://claude.ai/code/session_secret123' });
  assert.doesNotMatch(r.stdout + r.stderr, /session_secret123/);
});
