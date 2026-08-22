# Minecraft Bot Control Dashboard

A Node.js web application for connecting a Mineflayer bot to a Minecraft Java Edition server, viewing a live Prismarine-rendered first-person POV, and controlling movement, camera, chat, read-only inventory, and a manual PvP target lock from a browser.

This project is intended for servers you own or are explicitly allowed to use. It does not bypass authentication, anti-cheat, CAPTCHA, server permissions, or access controls. The bot connects normally using the host, port, username, version, and auth mode you provide in the dashboard or `.env`.

## Requirements

- Node.js 20 or newer
- npm
- A Minecraft Java Edition server you own or are authorized to use
- A server version supported by Mineflayer and Prismarine packages
- Java 17 when using a Forge 1.20.1 profile

## Forge 1.20.1 compatibility

Mineflayer is a protocol bot, not a Java Forge client, and cannot complete Forge mod-loader negotiation. Forge profiles (`loader: "forge"`) use a separate Forge process adapter. It does not fake packets, mod lists, Forge identity, or authentication. For offline-mode Forge profiles, the configured dashboard bot name is passed to the fixed `scripts/start-forge-client.sh` command as `BOT_USERNAME`; no Microsoft authentication is requested. The script passes the dashboard-selected host, port, Minecraft version, Forge version, and mod directory to a real deployment-installed Forge client bridge.

Official Forge provides a graphical client profile; it does **not** provide a generic headless gameplay client. This repository therefore reports a missing runtime/bridge rather than pretending the Forge installer alone is a headless client. Install the actual client runtime plus its Forge-compatible bridge at `minecraft/client` (`version.json` and executable `start.sh`). Mineflayer controls and Prismarine POV remain available for Mineflayer sessions; Forge profiles report `FORGE_POV_UNAVAILABLE` unless that bridge adds a control/telemetry/stream implementation.

## Installation

```bash
cd minecraft-bot-dashboard
npm install
cp .env.example .env
npm start
```

If this repository is already checked out at `/workspace/minecraft-bot`, run the commands from that directory.

## Environment configuration

Edit `.env` after copying `.env.example`:

```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_VERSION=1.20.4
BOT_USERNAME=MyBot
MINECRAFT_AUTH=offline
WEB_HOST=0.0.0.0
WEB_PORT=3000
VIEWER_PORT=3007
BOT_RECONNECT_DELAY=5000
DASHBOARD_PASSWORD=12345
LOG_LEVEL=info
MINECRAFT_LOADER=vanilla
FORGE_VERSION=47.3.0
MINECRAFT_HOME=minecraft
FORGE_HOME=minecraft/forge
MOD_DIRECTORY=minecraft/mods
JAVA_PATH=java
MAX_RECONNECT_ATTEMPTS=5
# Optional override; defaults to scripts/start-forge-client.sh.
# FORGE_CLIENT_COMMAND=/app/scripts/start-forge-client.sh
MINECRAFT_CLIENT_HOME=minecraft/client
MINECRAFT_CLIENT_LAUNCHER=minecraft/client/start.sh
```

`DASHBOARD_PASSWORD` defaults to `12345` in this project. Change it before exposing the dashboard beyond your own trusted network.

Use `MINECRAFT_AUTH=microsoft` only when your server requires Microsoft authentication and the installed Mineflayer version supports that flow. This application never attempts to bypass authentication.

## Running locally

- `npm start` starts the production server.
- `npm run dev` starts the server with nodemon.
- `npm run check` performs JavaScript syntax checks.

Open `http://localhost:3000`, enter the dashboard password, type the Minecraft server IP/host, port, bot name, version, and auth mode, then click **Connect**. The Prismarine POV is proxied through the dashboard server, so only `WEB_PORT` needs to be public.

## Railway deployment

Deploy using the included Dockerfile and Railway's start command `npm start`. The image contains Node 20, Java 17, and Canvas build/runtime libraries. The app uses Railway’s injected `PORT` automatically; set `WEB_PORT` only when you need to override it. Keep `VIEWER_PORT` internal; the dashboard forwards the POV and its WebSocket traffic through the web service port.

For a Forge profile, deploy the compatible client mod JARs (do not download unknown mods) to `minecraft/mods`, install the real client runtime and its compatible bridge under `minecraft/client`, set `FORGE_VERSION` to the server-compatible 47.x build, and run `npm run install:forge` during image/deployment preparation. The dashboard always launches `scripts/start-forge-client.sh` by default. Run `npm run diagnose` before deployment. The dashboard never returns authentication credentials or runner environment variables.

## Dashboard features

- Connect and disconnect the bot through REST endpoints.
- Type the server IP/host and port directly on the website before connecting.
- Rename the bot from the website before each connection by changing the bot name field.
- Live WebSocket status updates for online state, health, food, coordinates, yaw, pitch, dimension, game mode, and ping.
- First-person Prismarine 3D renderer that follows the bot session. It is a browser world renderer, not a pixel-perfect vanilla client video capture.
- Keyboard and touch movement controls using press/release semantics: W/A/S/D, Space, Shift, and Ctrl.
- Mouse and button camera controls with throttled WebSocket updates.
- Emergency **STOP EVERYTHING** button that releases all movement controls and disables PvP target lock.
- Chat panel for sending normal Minecraft chat and reading incoming messages.
- Read-only inventory viewer showing slot, item name, count, and durability information when available.
- Manual PvP target lock: the bot can lock its camera onto a nearby player and perform one range-limited manual attack when you press **Attack Once**. It does not provide anti-cheat bypasses or automatic command execution.
- Dashboard password protection with `DASHBOARD_PASSWORD=12345` by default.

## REST API

- `GET /health`
- `GET /api/status`
- `GET /api/config` exposes only non-secret dashboard configuration
- `POST /api/bot/connect` accepts `host`, `port`, `username`, `version`, and `auth`
- `POST /api/bot/disconnect`
- `POST /api/bot/stop`
- `GET /api/bot/inventory`
- `GET /api/bot/pvp`
- `POST /api/bot/pvp/lock`
- `POST /api/bot/pvp/attack`

When `DASHBOARD_PASSWORD` is set, protected endpoints require the `x-dashboard-password` header.

## WebSocket protocol

Client messages: `auth`, `connect_bot`, `disconnect_bot`, `control`, `camera`, `chat`, `stop_all`, `request_status`, `request_inventory`, `pvp_lock`, `pvp_attack`, and `pvp_request_targets`.

Server messages: `connection_state`, `bot_status`, `bot_position`, `bot_chat`, `bot_inventory`, `pvp_status`, `pvp_attack`, and `error`.

Incoming messages are validated, unknown commands are rejected, chat length is limited, connect options are allowlisted by shape, and basic WebSocket rate limiting is enforced.

## Troubleshooting

- **Server unavailable**: verify the host/port typed in the dashboard, firewall rules, and that the Minecraft server is running.
- **Version mismatch**: set the dashboard version field to the server version, for example `1.20.4`.
- **Authentication fails**: use the correct Mineflayer auth mode for your server. Online-mode public servers generally require Microsoft authentication.
- **POV does not load**: verify the bot has spawned and that the Railway service is running as a long-lived Node process. The viewer starts only after the bot spawns.
- **Controls do nothing**: click the POV/control area and confirm the bot is online. If a dashboard password is configured, authenticate by entering it before connecting.

## Security notes

The app is intended for personal or trusted use. It never exposes `.env` contents or Minecraft credentials, does not execute shell commands from the browser, does not use `eval()`, escapes chat before rendering, validates server connection input, and does not provide arbitrary Minecraft command execution.

## Project structure

```text
src/config        Environment loading
src/bot           Connection, movement, camera, chat, inventory, PvP lock, status modules
src/server        Express routes and WebSocket protocol
src/viewer        Isolated Prismarine viewer integration
src/utils         Logging and validation helpers
public            Vanilla HTML/CSS/JS dashboard
logs              Runtime log location placeholder
```

## Future upgrade path

The viewer module is isolated so a later pixel-perfect architecture can replace it without rewriting dashboard controls:

```text
Minecraft Client -> Virtual Display -> Video Encoder -> WebRTC -> Browser
```

The modular bot manager also leaves room for future features such as pathfinding, follow player, waypoints, multiple bot profiles, player/entity lists, permissions, recording, screenshots, and strictly allowlisted command tooling.
