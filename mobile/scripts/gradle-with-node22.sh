#!/usr/bin/env bash
# Run Android Gradle with Node 18+ on PATH. Expo's settings.gradle invokes `node` for
# autolinking; if your default `node` is too old (e.g. v12), Gradle fails with:
#   Process 'command 'node'' finished with non-zero exit value 1
# Matches engines.node and run-android-with-node22.sh behavior.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$MOBILE_DIR"

if [ -n "$NVM_DIR" ] && [ -f "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  nvm use 22 2>/dev/null || nvm use 2>/dev/null || true
elif [ -f "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  (nvm use 22 2>/dev/null || nvm use 2>/dev/null) || true
fi

NODE_VER=$(node -v 2>/dev/null || true)
if [ -z "$NODE_VER" ]; then
  echo "Error: node not found. Install Node 22+ (see package.json engines) and ensure it is on PATH." >&2
  exit 1
fi
MAJOR=$(echo "$NODE_VER" | sed -n 's/^v\([0-9]*\).*/\1/p')
if [ -n "$MAJOR" ] && [ "$MAJOR" -lt 18 ]; then
  echo "Error: Node 18+ required for Android / Expo autolinking (found $NODE_VER). Try: nvm install 22 && nvm use 22" >&2
  exit 1
fi

# Daemon may have been started with an older Node on PATH; refresh so autolinking sees the right runtime
(cd android && ./gradlew --stop 2>/dev/null) || true

cd "$MOBILE_DIR/android"
exec ./gradlew "$@"
