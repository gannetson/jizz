#!/bin/sh
# Xcode Cloud: Pods/ is gitignored (correct for open source). Generate CocoaPods
# support files before Xcode resolves baseConfigurationReference to Pods-*.xcconfig.
# Working directory when this runs is the repository root.
set -eu
cd mobile/ios
pod install
