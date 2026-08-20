#!/usr/bin/env bash
# Source this (do not exec). Sets ANDROID_HOME and a Gradle-compatible JAVA_HOME (JDK 17–21).
# Android Studio's bundled JBR can be JDK 25, which Gradle 8.x rejects:
#   Unsupported class file major version 69

if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  fi
fi
if [ -n "$ANDROID_HOME" ]; then
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
  export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
fi

java_major() {
  local home="$1"
  [ -x "$home/bin/java" ] || return 1
  "$home/bin/java" -version 2>&1 | awk -F '[".]' '/version/ { print ($2 == "1" ? $3 : $2); exit }'
}

java_is_supported() {
  local major
  major="$(java_major "$1")" || return 1
  [ -n "$major" ] && [ "$major" -ge 17 ] && [ "$major" -le 21 ]
}

if ! java_is_supported "${JAVA_HOME:-}"; then
  unset JAVA_HOME
  for candidate in \
    /opt/homebrew/opt/openjdk@17 \
    /usr/local/opt/openjdk@17 \
    /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
    /Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home \
    /opt/homebrew/opt/openjdk@21 \
    /usr/local/opt/openjdk@21
  do
    if java_is_supported "$candidate"; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

if [ -n "$JAVA_HOME" ]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if ! java_is_supported "${JAVA_HOME:-}"; then
  echo "Error: Android Gradle needs JDK 17–21 (Android Studio's JDK 25 is too new)." >&2
  echo "Install with: brew install openjdk@17" >&2
  echo "Then: export JAVA_HOME=\"/opt/homebrew/opt/openjdk@17\"" >&2
  return 1 2>/dev/null || exit 1
fi
