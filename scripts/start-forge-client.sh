#!/usr/bin/env sh
set -eu

JAVA_PATH="${JAVA_PATH:-java}"
MINECRAFT_HOME="${MINECRAFT_HOME:-minecraft}"
CLIENT_HOME="${MINECRAFT_CLIENT_HOME:-$MINECRAFT_HOME/client}"
FORGE_HOME="${FORGE_HOME:-$MINECRAFT_HOME/forge}"
MOD_DIRECTORY="${MOD_DIRECTORY:-$MINECRAFT_HOME/mods}"
CLIENT_LAUNCHER="${MINECRAFT_CLIENT_LAUNCHER:-$CLIENT_HOME/start.sh}"

if ! "$JAVA_PATH" -version >&2; then echo 'ERROR: JAVA_NOT_FOUND' >&2; exit 127; fi
if [ ! -d "$CLIENT_HOME" ] || [ ! -f "$CLIENT_HOME/version.json" ]; then echo 'ERROR: MINECRAFT_CLIENT_RUNTIME_MISSING' >&2; exit 2; fi
if [ ! -d "$FORGE_HOME" ] || ! find "$FORGE_HOME" -type f -name '*forge*installer*.jar' -print -quit | grep -q .; then echo 'ERROR: FORGE_INSTALLATION_MISSING' >&2; exit 3; fi
if [ ! -d "$MOD_DIRECTORY" ]; then echo 'ERROR: MOD_DIRECTORY_MISSING' >&2; exit 4; fi
if [ ! -x "$CLIENT_LAUNCHER" ]; then echo "ERROR: HEADLESS_CLIENT_BRIDGE_MISSING ($CLIENT_LAUNCHER)" >&2; exit 5; fi

# start.sh is a deployment-owned, genuine client/bridge entrypoint.  It must
# consume these variables and may accept newline-delimited whitelisted JSON on stdin.
export MINECRAFT_HOST MINECRAFT_PORT MINECRAFT_VERSION FORGE_VERSION MOD_DIRECTORY BOT_USERNAME MINECRAFT_AUTH
exec "$CLIENT_LAUNCHER"
