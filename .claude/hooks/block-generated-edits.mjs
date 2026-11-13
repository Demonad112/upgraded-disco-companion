// PreToolUse hook (Edit|Write): denies edits to generated files. Bash/PowerShell are not matched, so the regen
// commands (npm run tools -w @poe2/mcp, packages/data build:* scripts) still work. Exit 2 blocks the call and the
// stderr text goes back to Claude.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MESSAGE =
  'Generated file. Run `npm run tools -w @poe2/mcp` (TOOLS.md) or the packages/data build:* scripts instead.';

// Synced copies in apps/web/public (see apps/web/scripts/sync-data.mjs and .gitignore).
const SYNCED = [
  'passive-tree', 'mod-tiers', 'mod-display', 'monster-stats', 'pob-skills', 'bases', 'atlas-tree', 'trade2-stats',
  'trade-map',
].map((n) => `apps/web/public/${n}.json`);

const DIRS = ['packages/data/generated/', 'apps/web/out/'];
const FILES = ['apps/mcp/TOOLS.md', ...SYNCED];

export function isGenerated(filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  const p = filePath.replace(/\\/g, '/');
  const hit = (rel) => p === rel || p.endsWith(`/${rel}`);
  return DIRS.some((d) => p.startsWith(d) || p.includes(`/${d}`)) || FILES.some(hit);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  if (isGenerated(input?.tool_input?.file_path)) {
    console.error(MESSAGE);
    process.exit(2);
  }
}
