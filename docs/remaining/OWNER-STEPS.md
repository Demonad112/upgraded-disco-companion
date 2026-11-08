# Owner steps

Things only you can do: they need your accounts, devices, or game time. Tick each box when it is done. Each one is
independent, so do them in any order. Rough time is in brackets.

## Now

- [x] **1. Merge PR #111 (plain words)** (merged) (2 min)
  - Where: GitHub → Pull requests → #111 → once every check is green, click "Ready for review", then "Merge".
  - Worked if: the live site's farm cards show short summaries, and Pro detail still shows the long text.

- [x] **2. Check the security header after deploy** (1 min)
  - Run this in a terminal:
    `curl -sI https://upgraded-disco-companion.pages.dev/ | grep -i content-security-policy`
  - Worked if: the line contains `api.anthropic.com` and `generativelanguage.googleapis.com`.

- [x] **3. Confirm Lighthouse is green on main** (1 min)
  - Where: GitHub → Actions → CI → latest run on `main` → `lighthouse` job.
  - Worked if: it shows a green tick, and the log has no `NO_NAVSTART` line. If you see `NO_NAVSTART`, just note it; nothing breaks.

## When you play

- [ ] **4. Test one "Find better gear" link** (5 min)
  - Import a character on `/character/`, scroll to Gear targets, click "Find better gear".
  - Worked if: the official trade site opens with the stat filters already filled in, and shows results.
  - If it opens empty, copy the address bar URL into a note for the next session.

- [ ] **5. Trade site extras** (10 min, optional; you skipped this before)
  - On `/trade/`, build a long search (many stats), open it. Worked if trade loads it, not an error.
  - Change the listing status (online / any) and open again. Worked if trade shows the same status.
  - If you play on console: say whether trade links work for your realm.

- [ ] **6. Log about 50 maps** (over a few play sessions)
  - Follow `docs/remaining/R40-RUN-LOG.md`: one line per map in `docs/remaining/r40-run-log.csv`.
  - Play normally. At least 15 maps should have no danger mod on the Waystone.
  - Worked if: the file has about 50 rows. A session then tunes farm danger from it.

## On real devices

- [ ] **7. Phone check (iPhone Safari and Android Chrome)** (10 min)
  - Open the site. Tap into a search box: the bottom tab bar should hide while the keyboard is open, and return after.
  - Add to Home Screen / Install. It should open like an app.
  - Rotate the phone on `/dashboard/` and `/character/`. Nothing should spill sideways.
  - iPhone only: turn VoiceOver on and swipe through the home page. Every button should be read out.

- [ ] **8. Android share** (3 min)
  - With the app installed, open a poe.ninja character page in Chrome → Share → "Endgame" (the installed app).
  - Worked if: the app opens and imports that character.

- [ ] **9. Look and motion on a real screen + Safari** (5 min)
  - Watch the home page sky for 30 s: stars should fade smoothly, not blink.
  - Hover cards (desktop), move the lantern cursor, switch pages: no stutter or flashing.
  - Character bars and icons look sharp in Safari.

- [ ] **10. Farm picker on phone and Xbox** (5 min)
  - `/dashboard/` → pick a farm → Set up. The setup sheet should fit the screen, and the Apply button should be reachable.
  - Xbox browser: the same, using the controller.

## Send to a session

- [ ] **11. Two character files for pending tests** (5 min)
  - Needed: a poe.ninja export of a level 63 Martial Artist ("Yykiuy") and the level 94 Athrynas.
  - Save them as `packages/core/test/fixtures/yykiuy-v<version>.json` and `athrynas-94-v<version>.json`, or attach
    them in a chat and ask a session to add them. The tests switch on by themselves once the files exist.

## Report back
In your next chat, paste the numbers you ticked plus anything that failed, for example "1-4 done, 7: tab bar stays up on
iPhone". A session updates `REMAINING-WORK.md` from that.
