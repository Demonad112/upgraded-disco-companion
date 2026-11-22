// PostToolUse hook (Edit|Write): when a core or web source file was edited, remind Claude to check the route
// budget before the PR. Never blocks: always exits 0, and bad or missing stdin prints nothing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REMINDER =
  'Route budget: this file ships to the web app. Run npm run build -w @poe2/web && node scripts/route-weight.mjs before the PR.';

const WATCHED = ['packages/core/src/', 'apps/web/src/'];

export function isWatched(filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  const p = filePath.replace(/\\/g, '/');
  return WATCHED.some((d) => p.includes(d));
}

export function reminderFor(input) {
  const file = input?.tool_input?.file_path;
  if (!isWatched(file)) return null;
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: REMINDER } });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const out = reminderFor(JSON.parse(readFileSync(0, 'utf8')));
    if (out) process.stdout.write(out + '\n');
  } catch {
    // Bad input is not an error for a reminder hook.
  }
  process.exit(0);
}
