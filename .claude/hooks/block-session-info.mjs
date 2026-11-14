// PreToolUse hook (Bash, PowerShell, mcp__github__*): blocks calls that would put Claude session info on GitHub.
// Bash/PowerShell: checks git/gh publishing commands and any message/body file they pass (-F, --file, --body-file).
// GitHub MCP tools: checks every string in tool_input (title, body, commit message, comments) except file `content`,
// because committed docs such as CLAUDE.md legitimately quote the pattern. Same intent as scripts/check-pr-body.mjs;
// unanchored because it scans free text, and run before the text leaves the machine. Exit 2 blocks the call and the
// stderr text goes back to Claude.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PATTERNS = [/claude\.ai\/code\/session/i, /Claude-Session:/i];
const PUBLISHING = /\b(git\s+(commit|tag|notes|merge)|gh\s+(pr|issue|api|release|gist))\b/;
const FILE_ARG = /(?:^|\s)(?:-F|--file|--body-file)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/g;
const SKIP_KEYS = new Set(['content']);

function commandTexts(command, cwd) {
  if (!PUBLISHING.test(command)) return [];
  const texts = [['command', command]];
  for (const m of command.matchAll(FILE_ARG)) {
    const path = m[1] ?? m[2] ?? m[3];
    if (path === '-') continue;
    try {
      texts.push([path, readFileSync(resolve(cwd ?? process.cwd(), path), 'utf8')]);
    } catch {
      // Unreadable file: git/gh will report it; nothing to scan.
    }
  }
  return texts;
}

function mcpTexts(value, where = 'tool_input', out = []) {
  if (typeof value === 'string') out.push([where, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => mcpTexts(v, `${where}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) mcpTexts(v, `${where}.${k}`, out);
  }
  return out;
}

export function findHits(input) {
  const name = input?.tool_name ?? '';
  const texts = name.startsWith('mcp__')
    ? mcpTexts(input?.tool_input)
    : commandTexts(String(input?.tool_input?.command ?? ''), input?.cwd);
  const hits = [];
  for (const [where, text] of texts) {
    for (const re of PATTERNS) if (re.test(text)) hits.push(`${where}: ${re}`);
  }
  return hits;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  const hits = findHits(input);
  if (hits.length > 0) {
    console.error('Blocked: this would put Claude session info on GitHub (CLAUDE.md, Working style).');
    for (const h of hits) console.error(`  - ${h}`);
    console.error('Remove the session URL / Claude-Session trailer and retry.');
    process.exit(2);
  }
}
