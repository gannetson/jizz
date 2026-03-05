#!/usr/bin/env bash
# Run Gradle with Node 22 on PATH so Expo autolinking works.
# Usage: ./run-with-node22.sh [gradle tasks...]
# Example: ./run-with-node22.sh connectedDebugAndroidTest

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Prefer Node 22 from nvm so Expo autolinking (and other node scripts) see it
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  (cd "$MOBILE_DIR" && nvm use) || true
fi

# --no-daemon so this process's PATH (with Node 22) is used for node subprocesses
exec "$SCRIPT_DIR/gradlew" --no-daemon "$@"
