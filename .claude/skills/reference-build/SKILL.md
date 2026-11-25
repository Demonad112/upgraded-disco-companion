---
name: reference-build
description: Use when a task needs the reference PoB2 build (Batch 1/2 codes: gear, mods, skills, tree, config, gear score, swaps) or reference numbers for tests, goldens or UI. Read the committed decoded files instead of decoding a code again.
---

# Reference build

The two reference codes (the same ones Batch 1 and Batch 2 used; do not pick any other):

| Name | Code | Config |
|---|---|---|
| `ninja-default` | `packages/core/test/reference/ninja-default/code.txt` | poe.ninja's baseline |
| `pob2-own` | `packages/core/test/reference/pob2-own/code.txt` | the owner's own config |

Same character and gear; they differ only in config.

## Do this

1. Read `packages/core/test/reference/<name>/decoded.md`. It is the decoded build (identity, stats, skill groups, every item line with roll/tier, gear score, stat swaps, tree, config, what the code lacks). Do not decode the code, paste it, or run `pob2:run` for this.
2. Need a number the file lacks? Authority order: PoB code > `app.expected.json` > poe.ninja > repo. Grep `app.expected.json` or `oracle.json` for it; query with `node -e`, do not read whole files.
3. Only if `decoded.md` is missing, or `npm run decode:reference -- --check` fails (the gate runs it), regenerate: `npm run build -w @poe2/core && npm run decode:reference`. Review the diff (it is the golden-diff for decoder changes), commit it with the cause.

Never edit `decoded.md` by hand. Never "fix" a drift failure by weakening the check.
