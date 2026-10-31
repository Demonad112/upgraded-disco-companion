// Fails when a PR title or body carries Claude session info.
// In CI it reads the event payload ($GITHUB_EVENT_PATH): values passed through a step's `env:` are printed in the
// job log, which would publish the very text this guard blocks. PR_TITLE / PR_BODY override it (tests, local runs).
// Never argv or interpolated shell.
import { readFileSync } from 'node:fs';

const PATTERNS = [/claude\.ai\/code\/session/i, /^Claude-Session:/im];

function readFields() {
  if (process.env.PR_TITLE !== undefined || process.env.PR_BODY !== undefined) {
    return { title: process.env.PR_TITLE ?? '', body: process.env.PR_BODY ?? '' };
  }
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return { title: '', body: '' };
  const pr = JSON.parse(readFileSync(path, 'utf8')).pull_request ?? {};
  return { title: pr.title ?? '', body: pr.body ?? '' };
}

const fields = readFields();

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
