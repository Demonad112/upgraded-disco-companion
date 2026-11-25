// Runs the batch gate once, only for the areas the branch changed. Prints one line per command; a failing command
// also prints the tail of its output. `--dry` prints the plan only; `--base <ref>` sets the comparison (default origin/main).
// Exit 1 when any command fails. e2e and Lighthouse stay with CI.
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const starts = (f, ...p) => p.some((x) => f.startsWith(x));
const docsOnly = (f) => f.endsWith('.md') || starts(f, 'docs/', '.github/');

export function plan(files) {
  const fs = files.filter((f) => !docsOnly(f));
  const any = (...p) => fs.some((f) => starts(f, ...p));
  const cmds = [];
  const add = (c) => !cmds.includes(c) && cmds.push(c);
  if (fs.length === 0) return cmds;

  if (fs.some((f) => f === 'package.json' || f === 'package-lock.json' || f.endsWith('/package.json'))) {
    add('npm run check:all');
    return cmds;
  }
  const core = any('packages/core/');
  const coreSrc = any('packages/core/src/');
  const web = any('apps/web/');
  const webSrc = any('apps/web/src/');
  const webTestOnly = web && !webSrc && !any('apps/web/public/', 'apps/web/next.config', 'apps/web/scripts/');
  if (core || any('packages/data/')) add('npm run typecheck'); // builds core, then typechecks every workspace
  else if (web) add('npm run typecheck -w @poe2/web');
  if (core) add('npm run lint -w @poe2/core --if-present'); // core has no lint script
  if (web || coreSrc) add('npm run lint -w @poe2/web');
  if (core) add('npm run test:coverage -w @poe2/core'); // runs the core tests once, with the 90/75 floors
  if (web || coreSrc) add('npm run test -w @poe2/web');
  if ((coreSrc || webSrc) && !webTestOnly) {
    add('npm run build -w @poe2/web');
    add('node scripts/route-weight.mjs');
  }
  if (any('vendor/pob2/')) add('npm run pob2:verify');
  if (any('vendor/pob2/', 'tools/pob2/', 'scripts/pob2/', 'packages/core/test/reference/', 'packages/core/src/pob/')) {
    add('npm run pob2:oracle -- --check');
  }
  if (any('scripts/', '.claude/hooks/', 'packages/data/')) add('npm run test:scripts');
  if (any('services/ninja-proxy/')) add('npm --prefix services/ninja-proxy test');
  return cmds;
}

function changedFiles(base) {
  const run = (c) => execSync(c, { encoding: 'utf8' }).split('\n').filter(Boolean);
  return [...new Set([...run(`git diff --name-only ${base}...HEAD`), ...run('git diff --name-only HEAD'), ...run('git ls-files --others --exclude-standard')])];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
  const cmds = plan(changedFiles(base));
  if (cmds.length === 0) {
    console.log('gate: nothing to run (docs only or no changes)');
    process.exit(0);
  }
  if (args.includes('--dry')) {
    console.log(cmds.join('\n'));
    process.exit(0);
  }
  let failed = 0;
  for (const c of cmds) {
    const r = spawnSync(c, { shell: true, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status === 0) console.log(`PASS ${c}`);
    else {
      failed++;
      console.log(`FAIL ${c}\n${(r.stdout + r.stderr).split('\n').slice(-60).join('\n')}`);
    }
  }
  process.exit(failed ? 1 : 0);
}
