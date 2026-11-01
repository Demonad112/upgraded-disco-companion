// Fails when a PR title or body carries Claude session info.
// In CI it takes the PR number from the event payload ($GITHUB_EVENT_PATH) and reads the PR's current title and body
// from the API, so "Re-run job" after editing the description checks the edited text (a re-run replays the original
// payload). If the API can't be reached it falls back to the payload. Title and body never pass through a step's
// `env:` (the runner prints env values in the job log, which would publish the very text this guard blocks).
// PR_TITLE / PR_BODY override everything (tests, local runs). Never argv or interpolated shell.
import { readFileSync } from 'node:fs';

const PATTERNS = [/claude\.ai\/code\/session/i, /^Claude-Session:/im];

async function live(pr) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo } = process.env;
  const api = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  if (!token || !repo || !pr.number) return null;
  try {
    const res = await fetch(`${api}/repos/${repo}/pulls/${pr.number}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cur = await res.json();
    return { title: cur.title ?? '', body: cur.body ?? '' };
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
  return (await live(pr)) ?? { title: pr.title ?? '', body: pr.body ?? '' };
}

const fields = await readFields();

const hits = [];
for (const [name, text] of Object.entries(fields)) {
  for (const re of PATTERNS) {
    if (re.test(text)) hits.push(`${name}: ${re}`);
  }
}

if (hits.length > 0) {
  console.error('PR title/body contains session info:');
  for (const h of hits) console.error(`  - ${h}`);
  console.error('Delete that line from the PR description.');
  process.exit(1);
}
console.log('PR title and body: no session info.');
