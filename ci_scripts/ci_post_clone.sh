#!/bin/sh
# Xcode Cloud may discover ci_scripts at the repository root (monorepo).
# Delegate to the iOS project script next to Birdr.xcodeproj.
set -eu
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/.." && pwd)}"
exec "$REPO_ROOT/mobile/ios/ci_scripts/ci_post_clone.sh"
