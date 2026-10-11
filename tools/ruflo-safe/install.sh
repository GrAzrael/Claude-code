#!/bin/bash
# Installs Ruflo (ruvnet) in a locked-down configuration.
#
# - Installs into tools/ruflo-safe/node_modules (not global), from the
#   committed lockfile, with patched versions of vulnerable dependencies
#   forced via "overrides" in package.json.
# - Writes hardening env vars: no telemetry, no auto-update, no daemon,
#   encryption at rest, only core MCP tools.
#
# Usage: tools/ruflo-safe/install.sh [ENV_FILE]
#   ENV_FILE: file to append the env exports to (default: print them).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-/dev/stdout}"

cd "$DIR"
npm install --no-fund --no-audit --loglevel=error >&2

# Fail on critical CVEs; report anything high.
if ! npm audit --omit=dev --audit-level=critical >/dev/null 2>&1; then
  echo "ruflo-safe: critical vulnerabilities found, refusing to enable ruflo" >&2
  npm audit --omit=dev --audit-level=critical >&2 || true
  exit 1
fi
npm audit --omit=dev --audit-level=high >/dev/null 2>&1 \
  || echo "ruflo-safe: high-severity advisories remain (see: cd $DIR && npm audit)" >&2

# Per-machine encryption key, readable only by the owner.
KEY_DIR="$HOME/.config/ruflo"
KEY_FILE="$KEY_DIR/encryption.key"
mkdir -p "$KEY_DIR" && chmod 700 "$KEY_DIR"
if [ ! -s "$KEY_FILE" ]; then
  (umask 077 && openssl rand -hex 32 > "$KEY_FILE")
fi

cat >> "$ENV_FILE" <<EOF
export PATH="$DIR/node_modules/.bin:\$PATH"
export RUFLO_FUNNEL=0
export CLAUDE_FLOW_AUTO_UPDATE=false
export RUFLO_DAEMON_AUTOSTART=0
export CLAUDE_FLOW_ENCRYPT_AT_REST=1
export CLAUDE_FLOW_ENCRYPTION_KEY="\$(cat "$KEY_FILE")"
export CLAUDE_FLOW_MCP_TOOLS=memory,swarm,agent,hooks
EOF
