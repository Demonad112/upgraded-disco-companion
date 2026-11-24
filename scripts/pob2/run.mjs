// Runs real PoB2 headless (tools/pob2/snapshot.lua on vendor/pob2) and prints or writes JSON snapshots.
//
//   node scripts/pob2/run.mjs <code-file | ->     snapshot one PoB code (file or stdin) to stdout
//   npm run pob2:oracle [-- --check]              regenerate every current-league *.oracle.json (--check: fail on diff)
//   npm run pob2:spec                             busted specs in tools/pob2/spec (fixtures decoded first)
//   node scripts/pob2/run.mjs --export <mods|bases|skills|tree|constants>   dump PoB's own loaded data as JSON (tools/pob2/export/)
//
// Runner: local `luajit` when it parses PoB2 (compound assignment) and loads lua-utf8 (scripts/pob2/install-luajit.sh),
// else `docker run` of PoB's tests image pinned by digest in vendor/pob2/PIN.json. POB2_RUNNER=luajit|docker forces one.
// The code is decoded here with @poe2/core (PoB's headless Inflate is a stub), so build core first.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FIXTURES = join(ROOT, 'packages', 'core', 'test', 'pob2');
const SPEC_FIXTURES = join(ROOT, 'tools', 'pob2', 'spec', '.fixtures');
const PIN = join(ROOT, 'vendor', 'pob2', 'PIN.json');

/** JSON with object keys sorted at every level, 2-space indent, trailing newline: byte-stable oracle files. */
export function canonicalJson(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    }
    return v;
  };
  return JSON.stringify(sort(value), null, 2) + '\n';
}

/** Current-league fixtures: <FIXTURES>/<league>/<name>.code.txt, excluding archive/. */
export function currentLeagueCodes(dir = FIXTURES) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive')
    .flatMap((d) =>
      readdirSync(join(dir, d.name))
        .filter((f) => f.endsWith('.code.txt'))
        .sort()
        .map((f) => join(dir, d.name, f)),
    )
    .sort();
}

export const oraclePath = (codeFile) => codeFile.replace(/\.code\.txt$/, '.oracle.json');

function localLuajitWorks() {
  const r = spawnSync('luajit', ['-e', 'local a = 1; a += 1; require("lua-utf8")'], { stdio: 'ignore' });
  return r.status === 0;
}

function testsImage() {
  const image = JSON.parse(readFileSync(PIN, 'utf8')).testsImage;
  if (!image) throw new Error('vendor/pob2/PIN.json has no testsImage');
  return image;
}

export function pickRunner(env = process.env.POB2_RUNNER) {
  if (env === 'luajit' || env === 'docker') return env;
  if (env) throw new Error(`POB2_RUNNER must be luajit or docker, got ${env}`);
  return localLuajitWorks() ? 'luajit' : 'docker';
}

/** Command line for a Lua tool run from the repo root, locally or in PoB's tests image (repo mounted read-only). */
function luaCommand(runner, args) {
  if (runner === 'luajit') return { cmd: args[0], args: args.slice(1), env: { ...process.env, POB2_ROOT: ROOT } };
  return {
    cmd: 'docker',
    env: process.env,
    args: [
      'run', '--rm', '-i', '--network', 'none', '-e', 'HOME=/tmp', '-e', 'POB2_ROOT=/work',
      '-v', `${ROOT}:/work:ro`, '-w', '/work', testsImage(), ...args,
    ],
  };
}

async function decode(code) {
  const core = join(ROOT, 'packages', 'core', 'dist', 'index.js');
  if (!existsSync(core)) throw new Error('packages/core/dist missing: run npm run build -w @poe2/core');
  const { decodePobExport } = await import(pathToFileURL(core).href);
  return decodePobExport(code.trim());
}

/** Snapshot one PoB code. Returns the parsed snapshot (loadError set when PoB could not load it). */
export async function snapshot(code, runner = pickRunner()) {
  const xml = await decode(code);
  const { cmd, args, env } = luaCommand(runner, ['luajit', 'tools/pob2/snapshot.lua']);
  const r = spawnSync(cmd, args, { cwd: ROOT, env, input: xml, maxBuffer: 1 << 26, encoding: 'utf8' });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0 && r.status !== 1) {
    throw new Error(`snapshot.lua exited ${r.status}:\n${(r.stderr ?? '').split('\n').slice(-15).join('\n')}`);
  }
  return JSON.parse(r.stdout);
}

export const EXPORTS = ['mods', 'bases', 'skills', 'tree', 'constants'];

/**
 * Run one data exporter (tools/pob2/export/<name>.lua) against vendor/pob2 and return its parsed JSON.
 * Exporters need no build code: they dump PoB's own loaded tables (data.itemMods, data.skills, the latest tree, ...).
 */
export function exportData(name, runner = pickRunner()) {
  if (!EXPORTS.includes(name)) throw new Error(`unknown export "${name}" (${EXPORTS.join(', ')})`);
  const { cmd, args, env } = luaCommand(runner, ['luajit', `tools/pob2/export/${name}.lua`]);
  const r = spawnSync(cmd, args, { cwd: ROOT, env, input: '', maxBuffer: 1 << 28, encoding: 'utf8' });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`export ${name} exited ${r.status}:\n${(r.stderr ?? '').split('\n').slice(-15).join('\n')}`);
  }
  return JSON.parse(r.stdout);
}

async function oracle(check) {
  const runner = pickRunner();
  const codes = currentLeagueCodes();
  if (!codes.length) throw new Error(`no *.code.txt under ${relative(ROOT, FIXTURES)}/<league>/`);
  const stale = [];
  for (const file of codes) {
    const snap = await snapshot(readFileSync(file, 'utf8'), runner);
    if (snap.loadError) throw new Error(`${relative(ROOT, file)}: PoB loadError: ${snap.loadError}`);
    const text = canonicalJson(snap);
    const out = oraclePath(file);
    const before = existsSync(out) ? readFileSync(out, 'utf8') : null;
    if (before === text) {
      console.log(`ok       ${relative(ROOT, out)}`);
    } else if (check) {
      stale.push({ out, text });
      console.log(`DIFFERS  ${relative(ROOT, out)}`);
    } else {
      writeFileSync(out, text);
      console.log(`written  ${relative(ROOT, out)}`);
    }
  }
  console.log(`pob2:oracle ${codes.length} fixture(s) via ${runner}`);
  if (stale.length) {
    console.error(
      `${stale.length} oracle file(s) differ from what PoB computes now. Run npm run pob2:oracle, review the diff ` +
        'and commit it with the cause.',
    );
    if (process.env.GITHUB_ACTIONS) {
      // CI checkout is throwaway: write the regenerated files and print the diff, so it can be reviewed without Lua.
      for (const { out, text } of stale) writeFileSync(out, text);
      spawnSync('git', ['--no-pager', 'diff', '--no-color', '--', relative(ROOT, FIXTURES)], { cwd: ROOT, stdio: 'inherit' });
    }
    process.exit(1);
  }
}

async function spec() {
  const runner = pickRunner();
  rmSync(SPEC_FIXTURES, { recursive: true, force: true });
  mkdirSync(SPEC_FIXTURES, { recursive: true });
  const names = [];
  for (const file of currentLeagueCodes()) {
    const name = relative(FIXTURES, file).replace(/[/\\]/g, '__').replace(/\.code\.txt$/, '.xml');
    writeFileSync(join(SPEC_FIXTURES, name), await decode(readFileSync(file, 'utf8')));
    names.push(name);
  }
  writeFileSync(join(SPEC_FIXTURES, 'index.txt'), names.join('\n') + '\n');
  const { cmd, args, env } = luaCommand(runner, ['busted', '--lua=luajit', 'tools/pob2/spec']);
  if (runner === 'luajit' && spawnSync('busted', ['--version'], { stdio: 'ignore' }).status !== 0) {
    console.error('busted not installed (scripts/pob2/install-luajit.sh); the specs run in CI (pob2-oracle).');
    process.exit(1);
  }
  const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  try {
    if (argv[0] === '--oracle') await oracle(argv.includes('--check'));
    else if (argv[0] === '--spec') await spec();
    else if (argv[0] === '--export') {
      process.stdout.write(JSON.stringify(exportData(argv[1] ?? '')) + '\n');
    } else if (argv[0]) {
      const code = argv[0] === '-' ? readFileSync(0, 'utf8') : readFileSync(argv[0], 'utf8');
      const snap = await snapshot(code);
      process.stdout.write(canonicalJson(snap));
      process.exit(snap.loadError ? 1 : 0);
    } else {
      console.error('usage: node scripts/pob2/run.mjs <code-file | -> | --oracle [--check] | --spec | --export <name>');
      process.exit(2);
    }
  } catch (e) {
    console.error(`pob2:run: ${e.message}`);
    process.exit(2);
  }
}
