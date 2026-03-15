#!/usr/bin/env bash
# Run Gradle with Node 22 on PATH so autolinking (settings.gradle) works.
# Use when "Process 'command 'node'' finished with non-zero exit value 1".
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prefer nvm; fallback to node from PATH if it's 22+
if [ -n "$NVM_DIR" ] && [ -f "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  if nvm use 22 2>/dev/null || nvm use default 2>/dev/null; then
    :
  fi
elif [ -f "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  (nvm use 22 2>/dev/null || nvm use default 2>/dev/null) || true
fi

# Ensure node is Node 22+ (optional check)
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v 2>/dev/null || true)
  if [ -n "$NODE_VER" ]; then
    MAJOR=$(echo "$NODE_VER" | sed -n 's/^v\([0-9]*\).*/\1/p')
    if [ -n "$MAJOR" ] && [ "$MAJOR" -lt 18 ]; then
      echo "Warning: node is $NODE_VER; Node 18+ is required for autolinking. Use nvm use 22 first." >&2
    fi
  fi
fi

# Use --no-daemon so this process's PATH (with Node 22) is used when Gradle runs node for autolinking.
# A previously started daemon may have been created with an older Node on PATH.
exec ./gradlew --no-daemon "$@"
