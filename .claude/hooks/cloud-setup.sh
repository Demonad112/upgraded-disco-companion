#!/usr/bin/env bash
# Installs dependencies and builds @poe2/core when a Claude Code cloud session starts, resumes or clears.
# Does nothing on local machines. Installer output goes to stderr to keep session context small.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if [ -d node_modules ] && [ -f packages/core/dist/index.js ]; then
  echo "cloud-setup: already set up"
  exit 0
fi
if npm ci --no-audit --no-fund 1>&2 && npm run build -w @poe2/core 1>&2; then
  echo "cloud-setup: dependencies installed, @poe2/core built"
else
  echo "cloud-setup: FAILED (npm ci or core build); run 'npm ci && npm run build -w @poe2/core' by hand, see stderr"
fi
exit 0
