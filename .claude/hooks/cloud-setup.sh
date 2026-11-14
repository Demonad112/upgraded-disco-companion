#!/usr/bin/env bash
# Installs dependencies and builds @poe2/core when a Claude Code cloud session starts, resumes or clears.
# Does nothing on local machines. Fast on resume: `npm ci` runs only when package-lock.json changed since the last
# install (hash stamp in node_modules), and core rebuilds only when its src is newer than dist. Installer output goes
# to stderr to keep session context small. Never blocks the session: always exits 0 and prints a FAILED line instead.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

STAMP=node_modules/.cloud-setup-lock
DIST=packages/core/dist/index.js
lock_hash=$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1)
did=""

if [ ! -d node_modules ] || [ "$(cat "$STAMP" 2>/dev/null)" != "$lock_hash" ]; then
  if npm ci --no-audit --no-fund 1>&2; then
    echo "$lock_hash" > "$STAMP"
    did="dependencies installed"
  else
    echo "cloud-setup: FAILED (npm ci); run 'npm ci && npm run build -w @poe2/core' by hand, see stderr"
    exit 0
  fi
fi

if [ -n "$did" ] || [ ! -f "$DIST" ] || [ -n "$(find packages/core/src -newer "$DIST" -print -quit 2>/dev/null)" ]; then
  if npm run build -w @poe2/core 1>&2; then
    did="${did:+$did, }@poe2/core built"
  else
    echo "cloud-setup: FAILED (core build); run 'npm run build -w @poe2/core' by hand, see stderr"
    exit 0
  fi
fi

echo "cloud-setup: ${did:-already set up}"
exit 0
