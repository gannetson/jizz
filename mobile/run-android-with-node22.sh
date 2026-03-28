#!/usr/bin/env bash
# Run Expo Android build with Node 22 on PATH so Gradle autolinking (settings.gradle) works.
# Use when you get: Process 'command 'node'' finished with non-zero exit value 1
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prefer Node 22 via nvm so Gradle's node invocations see it
if [ -n "$NVM_DIR" ] && [ -f "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  nvm use 22 2>/dev/null || nvm use 2>/dev/null || true
elif [ -f "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  (nvm use 22 2>/dev/null || nvm use 2>/dev/null) || true
fi

# Ensure node is on PATH and is 22+ (Gradle autolinking requires it)
NODE_VER=$(node -v 2>/dev/null || true)
if [ -z "$NODE_VER" ]; then
  echo "Error: node not found. Install Node 22+ and ensure it is on PATH (e.g. nvm use 22)." >&2
  exit 1
fi
MAJOR=$(echo "$NODE_VER" | sed -n 's/^v\([0-9]*\).*/\1/p')
if [ -n "$MAJOR" ] && [ "$MAJOR" -lt 18 ]; then
  echo "Error: Node 18+ required for Android autolinking (found $NODE_VER). Run: nvm use 22" >&2
  exit 1
fi

# Stop Gradle daemon so it does not use an old Node from a previous run
if [ -d "android" ] && [ -f "android/gradlew" ]; then
  (cd android && ./gradlew --stop 2>/dev/null) || true
fi

exec npx expo run:android "$@"
