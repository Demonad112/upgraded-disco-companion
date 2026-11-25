// PreToolUse hook (Edit|Write): denies edits to generated files and asks before edits to quality thresholds. Bash/PowerShell are not matched, so the regen
// commands (the packages/data build:* scripts) still work. Exit 2 blocks the call and the
// stderr text goes back to Claude. package-lock.json is also blocked (npm writes it). Edits under the data
// folders get a reminder to check the e2e specs, which pin those shapes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MESSAGE =
  'Generated file. Run the packages/data build:* scripts instead (vendor/pob2: npm run pob2:sync; ' +
  'reference oracle.json: npm run pob2:oracle).';

// Synced copies in apps/web/public (see apps/web/scripts/sync-data.mjs and .gitignore).
const SYNCED = [
  'passive-tree', 'mod-tiers', 'mod-display', 'monster-stats', 'pob-skills', 'bases', 'atlas-tree', 'trade2-stats',
  'trade-map',
].map((n) => `apps/web/public/${n}.json`);

// vendor/pob2 is a byte-identical copy of the PoB2 fork; only scripts/pob2/sync.mjs (a Bash command) writes it.
const DIRS = ['packages/data/generated/', 'apps/web/out/', 'vendor/pob2/'];
const FILES = [...SYNCED];
// PoB2 oracle snapshots, written only by npm run pob2:oracle (headless PoB on the sibling code.txt).
const ORACLE = /(^|\/)packages\/core\/test\/reference\/[^/]+\/(groups\.)?oracle\.json$/;

export const LOCK_MESSAGE = 'package-lock.json is written by npm. Run npm install or npm ci instead of editing it.';
export const E2E_REMINDER =
  'Data shape reminder: grep apps/web/e2e for the old path or key and update the specs in the same commit.';
const REMIND_DIRS = ['apps/web/src/data/', 'packages/data/scripts/'];

const norm = (filePath) => filePath.replace(/\\/g, '/');

// Quality gates: thresholds and budgets CI enforces. Lowering one to get green needs the owner's OK, so edits ask first.
export const GATE_REASON =
  'Quality threshold or budget file. Fix the cause first; change a threshold or raise a budget only with the owner\'s OK.';
const GATE = /(^|\/)(lighthouserc\.json|scripts\/route-weight\.mjs|vitest\.config\.[cm]?[jt]s)$/;

export function isQualityGate(filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  return GATE.test(norm(filePath));
}

export function isLockfile(filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  const p = norm(filePath);
  return p === 'package-lock.json' || p.endsWith('/package-lock.json');
}

export function wantsE2eReminder(filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  const p = norm(filePath);
  return REMIND_DIRS.some((d) => p.startsWith(d) || p.includes(`/${d}`));
}

export function isGenerated(filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  const p = filePath.replace(/\\/g, '/');
  const hit = (rel) => p === rel || p.endsWith(`/${rel}`);
  return DIRS.some((d) => p.startsWith(d) || p.includes(`/${d}`)) || FILES.some(hit) || ORACLE.test(p);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  const file = input?.tool_input?.file_path;
  if (isGenerated(file)) {
    console.error(MESSAGE);
    process.exit(2);
  }
  if (isLockfile(file)) {
    console.error(LOCK_MESSAGE);
    process.exit(2);
  }
  if (isQualityGate(file)) {
    const hookSpecificOutput = { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: GATE_REASON };
    console.log(JSON.stringify({ hookSpecificOutput }));
    process.exit(0);
  }
  if (wantsE2eReminder(file)) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: E2E_REMINDER } }));
  }
}
