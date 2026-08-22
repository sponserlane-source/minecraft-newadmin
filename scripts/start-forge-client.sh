#!/usr/bin/env sh
set -eu

JAVA_PATH="${JAVA_PATH:-java}"
MINECRAFT_HOME="${MINECRAFT_HOME:-minecraft}"
CLIENT_HOME="${MINECRAFT_CLIENT_HOME:-$MINECRAFT_HOME}"
FORGE_HOME="${FORGE_HOME:-$MINECRAFT_HOME/forge}"
MOD_DIRECTORY="${MOD_DIRECTORY:-$MINECRAFT_HOME/mods}"
CLIENT_LAUNCHER="${MINECRAFT_CLIENT_LAUNCHER:-$MINECRAFT_HOME/client/start.sh}"

if ! "$JAVA_PATH" -version >&2; then echo 'ERROR: JAVA_RUNTIME_MISSING' >&2; exit 127; fi
if [ ! -f "$CLIENT_HOME/versions/$MINECRAFT_VERSION/$MINECRAFT_VERSION.json" ] || [ ! -f "$CLIENT_HOME/versions/$MINECRAFT_VERSION/$MINECRAFT_VERSION.jar" ] || [ ! -d "$CLIENT_HOME/libraries" ] || [ ! -d "$CLIENT_HOME/assets/objects" ]; then echo 'ERROR: MINECRAFT_CLIENT_RUNTIME_MISSING' >&2; exit 2; fi
if [ ! -d "$FORGE_HOME" ] || ! find "$FORGE_HOME" -type f -iname "forge-$MINECRAFT_VERSION-$FORGE_VERSION*" -print -quit | grep -q .; then echo 'ERROR: FORGE_RUNTIME_MISSING' >&2; exit 3; fi
if [ ! -d "$MOD_DIRECTORY" ]; then echo 'ERROR: FORGE_MOD_MISSING (mod directory missing)' >&2; exit 4; fi
if [ ! -x "$CLIENT_LAUNCHER" ]; then echo "ERROR: HEADLESS_CLIENT_BRIDGE_MISSING ($CLIENT_LAUNCHER)" >&2; exit 5; fi

# start.sh is a deployment-owned, genuine client/bridge entrypoint.  It must
# consume these variables and may accept newline-delimited whitelisted JSON on stdin.
export MINECRAFT_HOST MINECRAFT_PORT MINECRAFT_VERSION FORGE_VERSION MOD_DIRECTORY BOT_USERNAME MINECRAFT_AUTH
exec "$CLIENT_LAUNCHER"
