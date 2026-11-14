import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findHits } from './block-session-info.mjs';

const hook = fileURLToPath(new URL('./block-session-info.mjs', import.meta.url));
const URL_ = 'https://claude.ai/code/session_abc123';
const run = (payload) =>
  spawnSync(process.execPath, [hook], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
  });
const bash = (command, cwd) => ({ tool_name: 'Bash', tool_input: { command }, cwd });
const mcp = (tool, tool_input) => ({ tool_name: `mcp__github__${tool}`, tool_input });

test('blocks a git commit carrying the session URL', () => {
  const r = run(bash(`git commit -m "fix\n\n${URL_}"`));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Blocked/);
});

test('blocks a commit message file carrying the trailer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bsi-'));
  writeFileSync(join(dir, 'msg.txt'), 'fix\n\nClaude-Session: x\n');
  const r = run(bash('git commit -F msg.txt', dir));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /msg\.txt/);
});

test('allows a clean commit and non-publishing commands', () => {
  assert.equal(run(bash('git commit -m "fix: thing"')).status, 0);
  assert.equal(run(bash(`echo ${URL_}`)).status, 0);
});

test('blocks GitHub MCP PR title and body', () => {
  assert.equal(run(mcp('create_pull_request', { title: `x ${URL_}`, body: 'ok' })).status, 2);
  assert.equal(run(mcp('create_pull_request', { title: 'ok', body: `ok\n\n${URL_}` })).status, 2);
  assert.equal(run(mcp('update_pull_request', { body: 'Claude-Session: x' })).status, 2);
  assert.equal(run(mcp('create_pull_request', { title: 'ok', body: 'clean' })).status, 0);
});

test('blocks GitHub MCP comments and review bodies', () => {
  for (const tool of ['add_issue_comment', 'add_reply_to_pull_request_comment', 'add_comment_to_pending_review', 'pull_request_review_write']) {
    assert.equal(run(mcp(tool, { body: `see ${URL_}` })).status, 2, tool);
  }
});

test('push_files: scans the commit message, not file content', () => {
  const files = [{ path: 'CLAUDE.md', content: `never post ${URL_}` }];
  assert.equal(run(mcp('push_files', { message: 'docs', files })).status, 0);
  assert.equal(run(mcp('push_files', { message: `docs\n\n${URL_}`, files })).status, 2);
  assert.equal(run(mcp('create_or_update_file', { message: 'docs', content: URL_ })).status, 0);
});

test('bad JSON is let through', () => {
  assert.equal(run('not json').status, 0);
});

test('findHits names where the hit was', () => {
  assert.deepEqual(
    findHits(mcp('create_pull_request', { title: 'ok', body: URL_ })).map((h) => h.split(':')[0]),
    ['tool_input.body'],
  );
});
