// npm run pob2:verify: fails when vendor/pob2 differs from vendor/pob2/PIN.json (hash mismatch, extra or missing file).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIN_NAME, VENDOR_DIR, diffAgainstPin } from './lib.mjs';

let pin;
try {
  pin = JSON.parse(readFileSync(join(VENDOR_DIR, PIN_NAME), 'utf8'));
} catch (e) {
  console.error(`pob2:verify: cannot read vendor/pob2/${PIN_NAME}: ${e.message}. Run npm run pob2:sync.`);
  process.exit(1);
}
const { mismatched, missing, extra } = diffAgainstPin(VENDOR_DIR, pin);
const bad = mismatched.length + missing.length + extra.length;
if (bad) {
  for (const [label, list] of [['hash mismatch', mismatched], ['missing', missing], ['extra', extra]]) {
    for (const r of list.slice(0, 20)) console.error(`  ${label}: ${r}`);
    if (list.length > 20) console.error(`  ${label}: ... ${list.length - 20} more`);
  }
  console.error(`pob2:verify FAILED (${bad} file(s)). vendor/pob2 is written only by npm run pob2:sync; revert hand edits.`);
  process.exit(1);
}
console.log(`pob2:verify ok: ${Object.keys(pin.files).length} files match PIN ${pin.commit.slice(0, 9)}`);
