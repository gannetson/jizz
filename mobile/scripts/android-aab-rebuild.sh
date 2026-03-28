#!/usr/bin/env bash
# Fresh AAB without `gradlew clean` — Gradle's clean can fail on externalNativeBuildClean*
# when CMake codegen dirs are missing. Removing .cxx + app/build avoids that.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$MOBILE_DIR/android"

rm -rf app/.cxx app/build
./gradlew bundleRelease
