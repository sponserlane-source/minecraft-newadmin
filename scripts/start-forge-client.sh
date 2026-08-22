#!/usr/bin/env sh
set -eu

JAVA_PATH="${JAVA_PATH:-java}"
MINECRAFT_HOME="${MINECRAFT_HOME:-minecraft}"
CLIENT_HOME="${MINECRAFT_CLIENT_HOME:-$MINECRAFT_HOME/client}"
FORGE_HOME="${FORGE_HOME:-$MINECRAFT_HOME/forge}"
MOD_DIRECTORY="${MOD_DIRECTORY:-$MINECRAFT_HOME/mods}"
CLIENT_LAUNCHER="${MINECRAFT_CLIENT_LAUNCHER:-$MINECRAFT_HOME/client/start.sh}"
MINECRAFT_VERSION="${MINECRAFT_VERSION:-1.20.1}"
FORGE_VERSION="${FORGE_VERSION:-}"

if ! "$JAVA_PATH" -version >&2; then echo 'ERROR: JAVA_RUNTIME_MISSING (Java executable not found)' >&2; exit 127; fi
if ! "$JAVA_PATH" -version 2>&1 | head -1 | grep -Eq 'version "17(\.|\")'; then echo 'ERROR: JAVA_VERSION_MISMATCH (Java 17 is required)' >&2; exit 127; fi
if [ "$MINECRAFT_VERSION" != '1.20.1' ]; then echo "ERROR: MINECRAFT_VERSION_MISMATCH (expected 1.20.1, got $MINECRAFT_VERSION)" >&2; exit 2; fi
if ! echo "$FORGE_VERSION" | grep -Eq '^47\.[0-9]+\.[0-9]+$'; then echo "ERROR: FORGE_VERSION_MISMATCH (expected 47.x.x, got $FORGE_VERSION)" >&2; exit 3; fi
for required in "$CLIENT_HOME/versions/1.20.1/1.20.1.json" "$CLIENT_HOME/versions/1.20.1/1.20.1.jar" "$CLIENT_HOME/libraries" "$CLIENT_HOME/assets/objects"; do
  if [ ! -e "$required" ]; then echo "ERROR: MINECRAFT_CLIENT_RUNTIME_MISSING ($required)" >&2; exit 2; fi
done
if [ ! -d "$FORGE_HOME" ] || ! find "$FORGE_HOME" -type f -iname "forge-$MINECRAFT_VERSION-$FORGE_VERSION*" -print -quit | grep -q .; then echo 'ERROR: FORGE_RUNTIME_MISSING' >&2; exit 3; fi
if [ ! -d "$MOD_DIRECTORY" ]; then echo 'ERROR: FORGE_MOD_MISSING (mod directory missing)' >&2; exit 4; fi
if [ ! -x "$CLIENT_LAUNCHER" ]; then echo "ERROR: HEADLESS_CLIENT_BRIDGE_MISSING ($CLIENT_LAUNCHER)" >&2; exit 5; fi

# start.sh is a deployment-owned, genuine client/bridge entrypoint.  It must
# consume these variables and may accept newline-delimited whitelisted JSON on stdin.
export MINECRAFT_HOST MINECRAFT_PORT MINECRAFT_VERSION FORGE_VERSION MOD_DIRECTORY BOT_USERNAME MINECRAFT_AUTH
exec "$CLIENT_LAUNCHER"
