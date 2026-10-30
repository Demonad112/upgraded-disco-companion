// Fails when a PR title or body carries Claude session info.
// Input comes from the env (PR_TITLE, PR_BODY), never argv or interpolated shell.
const PATTERNS = [/claude\.ai\/code\/session/i, /^Claude-Session:/im];

const fields = { title: process.env.PR_TITLE ?? '', body: process.env.PR_BODY ?? '' };

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
