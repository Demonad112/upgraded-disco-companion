# Owner steps

These need your accounts, devices or game time, so only you can do them. Tick each box when it's done.
Do them in the order shown. Step 6 comes first because it takes longest, and the farm danger tuning (R10) waits on it.
The rest are independent. The step numbers stay the same so old reports still match. Time estimates are in brackets. Register IDs are in brackets after each title.

## Done

- [x] **1. Merge PR #111 (plain words)** (merged)

## Start now: it takes the longest

- [ ] **6. Log about 50 maps** (R40) (over a few play sessions)
  - Follow `docs/remaining/R40-RUN-LOG.md`: one line per map in `docs/remaining/r40-run-log.csv`.
  - Play normally. At least 15 maps should have no danger mod on the Waystone.
  - Done when the file has about 50 rows. A session then tunes farm danger from it (batch F1).

## Quick checks (2 min)

- [ ] **2. Check the security header after deploy** (R59) (1 min)
  - Run this in a terminal:
    `curl -sI https://upgraded-disco-companion.pages.dev/ | grep -i content-security-policy`
  - Passes if the line contains `api.anthropic.com` and `generativelanguage.googleapis.com`.

- [ ] **3. Confirm Lighthouse is green on main** (R49, R54) (1 min)
  - Where: GitHub → Actions → CI → latest run on `main` → `lighthouse` job.
  - Passes if it has a green tick and the log has no `NO_NAVSTART` line. If you see `NO_NAVSTART`, just note it; nothing breaks.

## When you play

- [ ] **4. Test one "Find better gear" link** (R42) (5 min)
  - Import a character on `/character/`, scroll to Gear targets, click "Find better gear".
  - Passes if the official trade site opens with the stat filters already filled in, and shows results.
  - If it opens empty, copy the address bar URL into a note for the next session.

## On real devices

- [ ] **7. Phone check (iPhone Safari and Android Chrome)** (R44) (10 min)
  - Open the site. Tap into a search box: the bottom tab bar should hide while the keyboard is open, and come back after.
  - Add to Home Screen / Install. It should open like an app.
  - Rotate the phone on `/dashboard/` and `/character/`. Nothing should spill sideways.
  - iPhone only: turn VoiceOver on and swipe through the home page. Every button should be read out.

- [ ] **8. Android share** (R45) (3 min)
  - With the app installed, open a poe.ninja character page in Chrome → Share → "Endgame" (the installed app).
  - Passes if the app opens and imports that character.

- [ ] **9. Look and motion on a real screen + Safari** (R46) (5 min)
  - Watch the home page sky for 30 s: stars should fade smoothly, not blink.
  - Hover cards (desktop), move the lantern cursor, switch pages: no stutter or flashing.
  - Character bars and icons look sharp in Safari.

- [ ] **10. Farm picker on phone and Xbox** (R47) (5 min)
  - `/dashboard/` → pick a farm → Set up. The setup sheet should fit the screen, and the Apply button should be reachable.
  - Xbox browser: the same, using the controller.

## Send to a session

- [ ] **11. Two character files for pending tests** (R60) (5 min)
  - Needed: a poe.ninja export of the level 63 Martial Artist ("Yykiuy") and of the level 94 Athrynas.
  - Save them as `packages/core/test/fixtures/yykiuy-v<version>.json` and `athrynas-94-v<version>.json`, or attach
    them in a chat and ask a session to add them. The tests switch on by themselves once the files exist (batch F2).

- [x] **12. Say OK or no to core tests** (PL1-1) (OK, 2026-11-08)
  - Batches N3 and F2 add tests under `packages/core/test` only, with no source or data change. Recommended: OK.

## Optional

- [ ] **5. Trade site extras** (R43) (10 min; you skipped this before)
  - On `/trade/`, build a long search (many stats) and open it. Passes if trade loads it, not an error.
  - Change the listing status (online / any) and open it again. Passes if trade shows the same status.
  - If you play on console: say whether trade links work for your realm.

## Report back
In your next chat, paste the step numbers you ticked plus anything that failed, for example "2-4 done, 7: tab bar stays up on
iPhone". A session updates `REMAINING-WORK.md` from that (batch F3).
