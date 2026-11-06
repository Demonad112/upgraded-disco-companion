import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sanitize } from './check-pr-body.mjs';

const script = fileURLToPath(new URL('./check-pr-body.mjs', import.meta.url));

function run(env) {
  const clean = { ...process.env };
  delete clean.PR_TITLE;
  delete clean.PR_BODY;
  delete clean.GITHUB_EVENT_PATH;
  delete clean.GITHUB_TOKEN;
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

// The live read: a stub API stands in for GitHub. spawn (not spawnSync) so this process can answer the request.
async function withApi(handler, fn) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

function runLive(env) {
  const clean = { ...process.env };
  for (const k of ['PR_TITLE', 'PR_BODY', 'GITHUB_EVENT_PATH', 'GITHUB_TOKEN']) delete clean[k];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], { env: { ...clean, GITHUB_REPOSITORY: 'o/r', ...env } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (status) => resolve({ status, out }));
  });
}

test('a re-run checks the current body, not the replayed payload', async () => {
  const stale = eventFile({ number: 7, title: 'x', body: 'https://claude.ai/code/session_old' });
  let seen = '';
  const r = await withApi(
    (req, res) => {
      seen = `${req.url} ${req.headers.authorization}`;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ title: 'x', body: 'edited, clean' }));
    },
    (api) => runLive({ GITHUB_EVENT_PATH: stale, GITHUB_TOKEN: 't0k', GITHUB_API_URL: api }),
  );
  assert.equal(r.status, 0);
  assert.equal(seen, '/repos/o/r/pulls/7 Bearer t0k');
});

test('a session link in the current body fails even if the payload was clean', async () => {
  const clean = eventFile({ number: 7, title: 'x', body: 'ok' });
  const r = await withApi(
    (req, res) => res.end(JSON.stringify({ title: 'x', body: 'https://claude.ai/code/session_new' })),
    (api) => runLive({ GITHUB_EVENT_PATH: clean, GITHUB_TOKEN: 't', GITHUB_API_URL: api }),
  );
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.out, /session_new/);
});

test('falls back to the payload when the API fails', async () => {
  const bad = eventFile({ number: 7, title: 'x', body: 'https://claude.ai/code/session_abc' });
  const r = await withApi(
    (req, res) => {
      res.statusCode = 500;
      res.end();
    },
    (api) => runLive({ GITHUB_EVENT_PATH: bad, GITHUB_TOKEN: 't', GITHUB_API_URL: api }),
  );
  assert.equal(r.status, 1);
  assert.match(r.out, /HTTP 500/);
});

test('sanitize keeps the attribution and drops the session part', () => {
  const body = 'Summary\n\n---\n_Generated by [Claude Code](https://claude.ai/code/session_01AbC-x)_\nClaude-Session: abc\n';
  const out = sanitize(body);
  assert.equal(out, 'Summary\n\n---\n_Generated by [Claude Code](https://claude.ai/code)_\n');
});

test('fix mode cuts the session link from the body and passes', async () => {
  const ev = eventFile({ number: 7, title: 'x', body: 'stale' });
  let patched = null;
  const r = await withApi(
    (req, res) => {
      let data = '';
      req.on('data', (d) => (data += d));
      req.on('end', () => {
        if (req.method === 'PATCH') patched = JSON.parse(data).body;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ title: 'x', body: 'done\n_[Claude Code](https://claude.ai/code/session_new)_' }));
      });
    },
    (api) => runLive({ GITHUB_EVENT_PATH: ev, GITHUB_TOKEN: 't', GITHUB_API_URL: api, PR_GUARD_FIX: '1' }),
  );
  assert.equal(r.status, 0);
  assert.equal(patched, 'done\n_[Claude Code](https://claude.ai/code)_');
  assert.doesNotMatch(r.out, /session_new/);
});

test('fix mode still fails on a title hit and does not patch', async () => {
  const ev = eventFile({ number: 7, title: 'x', body: 'ok' });
  let methods = [];
  const r = await withApi(
    (req, res) => {
      methods.push(req.method);
      res.end(JSON.stringify({ title: 'https://claude.ai/code/session_t', body: 'ok' }));
    },
    (api) => runLive({ GITHUB_EVENT_PATH: ev, GITHUB_TOKEN: 't', GITHUB_API_URL: api, PR_GUARD_FIX: '1' }),
  );
  assert.equal(r.status, 1);
  assert.deepEqual(methods, ['GET']);
});

test('fix mode fails when the PATCH is refused', async () => {
  const ev = eventFile({ number: 7, title: 'x', body: 'ok' });
  const r = await withApi(
    (req, res) => {
      if (req.method === 'PATCH') {
        res.statusCode = 403;
        return res.end();
      }
      res.end(JSON.stringify({ title: 'x', body: 'https://claude.ai/code/session_b' }));
    },
    (api) => runLive({ GITHUB_EVENT_PATH: ev, GITHUB_TOKEN: 't', GITHUB_API_URL: api, PR_GUARD_FIX: '1' }),
  );
  assert.equal(r.status, 1);
  assert.match(r.out, /HTTP 403/);
});
