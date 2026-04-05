#!/usr/bin/env bash
# Fresh release bundle (.aab) without `gradlew clean`.
# Do not use `./gradlew clean` for RN Android (new arch): clean runs CMake for native clean
# and fails with "add_subdirectory ... codegen/jni ... is not an existing directory" when
# those paths were deleted. Use this script instead: rm app/.cxx app/build then bundleRelease.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$MOBILE_DIR"

rm -rf android/app/.cxx android/app/build
bash scripts/gradle-with-node22.sh bundleRelease
