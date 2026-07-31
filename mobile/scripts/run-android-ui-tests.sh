#!/usr/bin/env bash
# Run connected Android instrumented tests and dump diagnostics on failure.
set -euo pipefail
export CI=true
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"

if ./gradlew connectedDebugAndroidTest --no-daemon --stacktrace; then
  exit 0
fi

echo '==== Gradle androidTest results ===='
find . -path '*/build/outputs/androidTest-results/**' -type f -print -exec tail -n 80 {} \; 2>/dev/null || true
find . -path '*/build/reports/androidTests/**' -type f | head -40 || true
echo '==== logcat (last 200 lines) ===='
adb logcat -d 2>/dev/null | tail -n 200 || true
exit 1
