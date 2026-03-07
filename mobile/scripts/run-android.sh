#!/usr/bin/env bash
# Run Android build with Node 18+ (required by React Native / Gradle autolinking).
# Use this if your default `node` is older (e.g. when running from an IDE):
#   ./scripts/run-android.sh
# Or from project root:  cd mobile && ./scripts/run-android.sh

set -e
cd "$(dirname "$0")/.."

# Prefer nvm to switch to Node from .nvmrc
if [ -n "$NVM_DIR" ] && [ -f "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 2>/dev/null || nvm use 22 2>/dev/null || true
fi

# Ensure Node 18+
node_major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0")
if [ "$node_major" -lt 18 ]; then
  echo "Error: Android build needs Node 18+. Current: $(node -v 2>/dev/null)."
  echo "Run: nvm use 22   (or install Node 18+ and ensure it is on PATH)"
  exit 1
fi

exec npx expo run:android "$@"
