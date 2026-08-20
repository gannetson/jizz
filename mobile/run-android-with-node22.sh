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

export NODE_BINARY="$(command -v node)"

# ANDROID_HOME + JDK 17 (Android Studio's JBR 25 breaks Gradle)
# shellcheck source=/dev/null
source "$SCRIPT_DIR/scripts/ensure-android-env.sh"

# Stop Gradle daemon so it does not keep an old Node or JDK 25
if [ -d "android" ] && [ -f "android/gradlew" ]; then
  (cd android && ./gradlew --stop 2>/dev/null) || true
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "Error: adb not found. Install Android Studio's SDK (platform-tools) and set ANDROID_HOME to it." >&2
  echo "  Typical macOS path: $HOME/Library/Android/sdk" >&2
  exit 1
fi

if ! adb devices 2>/dev/null | awk 'NR>1 && $2=="device" {found=1} END {exit !found}'; then
  AVDS="$(emulator -list-avds 2>/dev/null || true)"
  if [ -z "$AVDS" ]; then
    echo "Error: no Android device or emulator is running, and no AVDs were found." >&2
    echo "Create one in Android Studio: Device Manager → Create Virtual Device." >&2
    exit 1
  fi
  echo "No emulator is running. Expo will try to start: $(echo "$AVDS" | tr '\n' ' ')"
  echo "If that fails, open Android Studio → Device Manager → Play, wait for the home screen, then re-run."
fi

exec npx expo run:android "$@"
