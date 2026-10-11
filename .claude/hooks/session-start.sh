#!/bin/bash
set -euo pipefail

# Only in Claude Code cloud sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

"$CLAUDE_PROJECT_DIR/tools/ruflo-safe/install.sh" "${CLAUDE_ENV_FILE:-/dev/null}"
