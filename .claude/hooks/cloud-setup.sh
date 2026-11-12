#!/usr/bin/env bash
# Installs dependencies and builds @poe2/core when a Claude Code cloud session starts (web, mobile, desktop cloud).
# Does nothing on local machines. Installer output goes to stderr to keep session context small.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
log() { echo "[cloud-setup] $*" >&2; }

npm ci --no-audit --no-fund 1>&2 || log "npm ci failed"
npm run build -w @poe2/core 1>&2 || log "core build failed"

echo "cloud-setup: dependencies installed (see stderr for failures)"
exit 0
