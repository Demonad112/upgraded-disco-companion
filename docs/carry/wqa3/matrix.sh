#!/bin/bash
# WQA3 scroll matrix. Results: one JSON line per run.
cd "$(dirname "$0")"
L=https://upgraded-disco-companion.pages.dev
LOC=http://localhost:4321
OUT=${OUT:-/tmp/wqa3-results.jsonl}
ROUTES="/ /character /character?import /dashboard /atlas /checklist /trade /methodology /whats-new"
run() { node scroll-audit.cjs "$@" "$OUT" > /dev/null 2>> errors.log || node scroll-audit.cjs "$@" "$OUT" > /dev/null 2>> errors.log; }
for r in $ROUTES; do
  run $L phone sky "$r" touch
  run $L phone sky "$r" wheel
  run $L phone sky "$r" toolbar
  run $L phone rm "$r" touch
  run $L phone nosky "$r" touch
  run $L desktop sky "$r" wheel
  run $L desktop rm "$r" wheel
  run $L desktop nosky "$r" wheel
  run $LOC phone sky "$r" touch
  run $LOC desktop sky "$r" wheel
done
for r in /checklist /character?import /; do
  for v in dimoff nograin noshadow bare; do run $L phone $v "$r" touch; done
  for v in dimoff bare; do run $L desktop $v "$r" wheel; done
done
echo DONE >> $OUT.done
