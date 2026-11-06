// Fails when a PR title or body carries Claude session info.
// In CI it takes the PR number from the event payload ($GITHUB_EVENT_PATH) and reads the PR's current title and body
// from the API, so "Re-run job" after editing the description checks the edited text (a re-run replays the original
// payload). If the API can't be reached it falls back to the payload. Title and body never pass through a step's
// `env:` (the runner prints env values in the job log, which would publish the very text this guard blocks).
// PR_TITLE / PR_BODY override everything (tests, local runs). Never argv or interpolated shell.
// With PR_GUARD_FIX=1 (CI) a hit only in the body is fixed instead of failed: the session link is cut from the body
// through the API (the GitHub connector appends it to every PR it opens), and the check passes. A title hit still fails.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PATTERNS = [/claude\.ai\/code\/session/i, /^Claude-Session:/im];

// Keeps the attribution text, drops only the session part: `…/code/session_x` -> `…/code`, trailer lines removed.
export function sanitize(body) {
  return body
    .replace(/(claude\.ai\/code)\/session[\w-]*/gi, '$1')
    .replace(/^Claude-Session:.*(?:\r?\n)?/gim, '')
    .replace(/\n{3,}$/, '\n');
}

function api() {
  return process.env.GITHUB_API_URL ?? 'https://api.github.com';
}

async function live(pr) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo } = process.env;
  if (!token || !repo || !pr.number) return null;
  try {
    const res = await fetch(`${api()}/repos/${repo}/pulls/${pr.number}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cur = await res.json();
    return { title: cur.title ?? '', body: cur.body ?? '', number: pr.number };
  } catch (e) {
    console.log(`Could not read the current PR (${e.message}); checking the event payload instead.`);
    return null;
  }
}

async function readFields() {
  if (process.env.PR_TITLE !== undefined || process.env.PR_BODY !== undefined) {
    return { title: process.env.PR_TITLE ?? '', body: process.env.PR_BODY ?? '' };
  }
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return { title: '', body: '' };
  const pr = JSON.parse(readFileSync(path, 'utf8')).pull_request ?? {};
  return (await live(pr)) ?? { title: pr.title ?? '', body: pr.body ?? '', number: pr.number };
}

async function fixBody(number, body) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo } = process.env;
  if (process.env.PR_GUARD_FIX !== '1' || !token || !repo || !number) return false;
  try {
    const res = await fetch(`${api()}/repos/${repo}/pulls/${number}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
      body: JSON.stringify({ body: sanitize(body) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (e) {
    console.log(`Could not fix the PR body (${e.message}).`);
    return false;
  }
}

function scan(fields) {
  const found = [];
  for (const name of ['title', 'body']) {
    for (const re of PATTERNS) {
      if (re.test(fields[name])) found.push(`${name}: ${re}`);
    }
  }
  return found;
}

// Only run as a script, so tests can import sanitize().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fields = await readFields();
  let hits = scan(fields);
  if (hits.length > 0 && !hits.some((h) => h.startsWith('title')) && (await fixBody(fields.number, fields.body))) {
    console.log('Removed session info from the PR body.');
    hits = scan({ title: fields.title, body: sanitize(fields.body) });
  }
  report(hits);
}

function report(hits) {
  if (hits.length > 0) {
    console.error('PR title/body contains session info:');
    for (const h of hits) console.error(`  - ${h}`);
    console.error('Delete that line from the PR description.');
    process.exit(1);
  }
  console.log('PR title and body: no session info.');
}
