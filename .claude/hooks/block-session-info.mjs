// PreToolUse hook (Bash, PowerShell): blocks git/gh commands that would put Claude session info on GitHub.
// Checks the command text and any message/body file it passes (-F, --file, --body-file). Same patterns as
// scripts/check-pr-body.mjs, but run before the text leaves the machine. Exit 2 blocks the call and the
// stderr text goes back to Claude.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PATTERNS = [/claude\.ai\/code\/session/i, /Claude-Session:/i];
const PUBLISHING = /\b(git\s+(commit|tag|notes|merge)|gh\s+(pr|issue|api|release|gist))\b/;
const FILE_ARG = /(?:^|\s)(?:-F|--file|--body-file)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/g;

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const command = input?.tool_input?.command ?? '';
if (!PUBLISHING.test(command)) process.exit(0);

const texts = [['command', command]];
for (const m of command.matchAll(FILE_ARG)) {
  const path = m[1] ?? m[2] ?? m[3];
  if (path === '-') continue;
  try {
    texts.push([path, readFileSync(resolve(input.cwd ?? process.cwd(), path), 'utf8')]);
  } catch {
    // Unreadable file: git/gh will report it; nothing to scan.
  }
}

const hits = [];
for (const [where, text] of texts) {
  for (const re of PATTERNS) if (re.test(text)) hits.push(`${where}: ${re}`);
}
if (hits.length > 0) {
  console.error('Blocked: this would put Claude session info on GitHub (CLAUDE.md, Working style).');
  for (const h of hits) console.error(`  - ${h}`);
  console.error('Remove the session URL / Claude-Session trailer and retry.');
  process.exit(2);
}
