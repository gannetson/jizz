#!/bin/sh
# Xcode Cloud runs this after clone, from the ci_scripts directory.
# Pods/ is gitignored; Expo Podfile also needs node_modules before pod install.
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Prefer Apple's env; fall back when this script lives at mobile/ios/ci_scripts.
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
MOBILE_DIR="$REPO_ROOT/mobile"
IOS_DIR="$MOBILE_DIR/ios"

echo "▸ CI_PRIMARY_REPOSITORY_PATH=${CI_PRIMARY_REPOSITORY_PATH:-unset}"
echo "▸ REPO_ROOT=$REPO_ROOT"
echo "▸ Installing Node / CocoaPods deps for Birdr"

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

ensure_node_22() {
  if command -v node >/dev/null 2>&1; then
    major="$(node -p "process.versions.node.split('.')[0]")"
    if [ "$major" -ge 22 ]; then
      echo "▸ node $(node --version)"
      return 0
    fi
  fi
  echo "▸ Installing node@22 via Homebrew"
  brew install node@22
  brew link --overwrite --force node@22 || true
  export PATH="$(brew --prefix node@22)/bin:${PATH}"
  echo "▸ node $(node --version)"
}

ensure_node_22

if ! command -v pod >/dev/null 2>&1; then
  echo "▸ Installing CocoaPods via Homebrew"
  brew install cocoapods
fi
echo "▸ pod $(pod --version)"

cd "$MOBILE_DIR"
echo "▸ npm ci in $MOBILE_DIR"
npm ci

cd "$IOS_DIR"
echo "▸ pod install in $IOS_DIR"
pod install

test -f "Pods/Target Support Files/Pods-Birdr/Pods-Birdr.release.xcconfig"
echo "▸ Pods ready"
