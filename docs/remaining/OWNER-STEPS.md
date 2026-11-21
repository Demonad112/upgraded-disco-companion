# Owner steps

These need your accounts, devices or game time, so only you can do them. Tick each box when it's done.
Do them in the order shown; they are independent. The step numbers stay the same so old reports still match. Time estimates are in brackets. Register IDs are in brackets after each title.

## Done

- [x] **1. Merge PR #111 (plain words)** (merged)

## Quick checks (2 min)

- [x] **2. Check the security header after deploy** (R59) (1 min)
  - Run this in a terminal:
    `curl -sI https://upgraded-disco-companion.pages.dev/ | grep -i content-security-policy`
  - Passes if the line contains `api.anthropic.com` and `generativelanguage.googleapis.com`.

- [x] **3. Confirm Lighthouse is green on main** (R49, R54) (1 min)
  - Where: GitHub → Actions → CI → latest run on `main` → `lighthouse` job.
  - Passes if it has a green tick and the log has no `NO_NAVSTART` line. If you see `NO_NAVSTART`, just note it; nothing breaks.

## When you play

- [x] **4. Test one "Find better gear" link** (R42) (done 2026-11-08: weighted group prefilled)
  - Import a character on `/character/`, scroll to Gear targets, click "Find better gear".
  - Passes if the official trade site opens with the stat filters already filled in, and shows results.
  - If it opens empty, copy the address bar URL into a note for the next session.

## On real devices

- [ ] **7. Phone check (iPhone Safari and Android Chrome)** (on hold 2026-11-21) (R44) (10 min)
  - Open the site. Tap into a search box: the bottom tab bar should hide while the keyboard is open, and come back after.
  - Add to Home Screen / Install. It should open like an app.
  - Rotate the phone on `/dashboard/` and `/character/`. Nothing should spill sideways.
  - iPhone only: turn VoiceOver on and swipe through the home page. Every button should be read out.

- [ ] **8. Android share** (on hold 2026-11-21) (R45) (3 min)
  - With the app installed, open a poe.ninja character page in Chrome → Share → "Endgame" (the installed app).
  - Passes if the app opens and imports that character.

- [ ] **9. Look and motion on a real screen + Safari** (on hold 2026-11-21) (R46) (5 min)
  - Watch the home page sky for 30 s: stars should fade smoothly, not blink.
  - Hover cards (desktop), move the lantern cursor, switch pages: no stutter or flashing.
  - Character bars and icons look sharp in Safari.

- [ ] **10. Farm picker on phone and Xbox** (on hold 2026-11-21) (R47) (5 min)
  - `/dashboard/` → pick a farm → Set up. The setup sheet should fit the screen, and the Apply button should be reachable.
  - Xbox browser: the same, using the controller.

## Send to a session

- [ ] **11. One character file for pending tests** (R60) (moved 2026-11-21: now a **minion** build PoB code for the second pass, `docs/plans/pob-character-analysis.md` W4) (5 min; Yykiuy is done: `yykiuy-v51.json`, `yykiuy-v80.json`)
  - Needed: a poe.ninja export of the level 94 Athrynas (the Yykiuy files are already in `packages/core/test/fixtures/`).
  - Save it as `packages/core/test/fixtures/athrynas-94-v<version>.json`, or attach it in a chat and ask a session to add it.

- [x] **12. Say OK or no to core tests** (PL1-1) (OK, 2026-11-08)
  - Batches N3 and F2 add tests under `packages/core/test` only, with no source or data change. Recommended: OK.

## Character import and ladder (NP1)

- [x] **13. Copy two poe.ninja request URLs** (NP1-1) (done 2026-11-18, both HARs received)
  - Result: both new paths sit under `/api/protected/` and need the browser's poe.ninja cookies, so the proxy can't use them.
- [x] **14. Ask poe.ninja for API access** (NP1-1) (disregarded 2026-11-21) (10 min) — character import by URL and the ladder grade stay down until then
  - Ask on poe.ninja's Discord or Patreon for an API key or an allowlisted User-Agent for a non-commercial PoE2 companion. Mention it calls the character model and builds search, a few requests per user action, cached 30 min.
  - Paste the answer into a session chat with "NP1-1". Until then, paste-JSON and PoB-code imports keep working.

## PoB comparison run

- [ ] **15. Run one PoB code through the site and through PoB2** (NP1-6b, GF1-6) (15 min)
  - Follow `docs/plans/pob-character-analysis.md` §4: `node scripts/pob-sheet.mjs code.txt`, then send §5's prompt to your PoB2 MCP with the same code.
  - Paste both outputs into a session with "tune from the PoB comparison".

## Optional

- [ ] **5. Trade site extras** (R43) (done 2026-11-08 except the console realm; only that check is left)
  - On `/trade/`, build a long search (many stats) and open it. Passes if trade loads it, not an error.
  - Change the listing status (online / any) and open it again. Passes if trade shows the same status.
  - If you play on console: say whether trade links work for your realm.

## Report back
In your next chat, paste the step numbers you ticked plus anything that failed, for example "2-4 done, 7: tab bar stays up on
iPhone". A session updates `REMAINING-WORK.md` from that (batch F3).
