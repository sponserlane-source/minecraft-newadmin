# Minecraft Bot Control Dashboard

This existing dashboard controls normal Mineflayer sessions and can supervise a **user-supplied, legitimate** Forge 1.20.1 client bridge. It never downloads an unofficial Minecraft runtime, bypasses Microsoft authentication, fabricates Forge packets, or pretends that a Forge client has a POV when the supplied bridge has not provided one.

## Required Forge runtime

The container creates writable `minecraft/mods`, `minecraft/config`, and `minecraft/logs` automatically. Mount a persistent volume at `minecraft` and supply your licensed runtime and bridge in this layout:

```text
minecraft/
├── client/
│   ├── start.sh                         # executable genuine bridge (you provide)
│   ├── versions/1.20.1/1.20.1.json
│   ├── versions/1.20.1/1.20.1.jar
│   ├── libraries/
│   └── assets/objects/
├── forge/                               # Forge 1.20.1 47.x runtime JAR(s)
├── mods/                                # place Forge-compatible client .jar files here
├── config/
└── logs/
```

`minecraft/client/start.sh` is not a placeholder supplied by this repository. It must launch your actual Forge 1.20.1 runtime, use the exported server/authentication variables, consume newline-delimited JSON controls on stdin (`chat`, `move`, `look`, `jump`, `attack`, `useItem`), and emit newline-delimited JSON telemetry on stdout. Supported bridge events are `{ "type":"status", "state":"CONNECTED", "data": {...} }`; other output is logged. This explicit boundary prevents a shell-script simulation of a Minecraft client.

Forge profiles are strictly Minecraft `1.20.1` and Forge `47.x.x`; Java must be 17. Microsoft authentication is passed to a bridge as `MINECRAFT_AUTH=microsoft`, never replaced or bypassed.

## Configuration and Railway

Set `DASHBOARD_PASSWORD` (required for a protected production dashboard), `WEB_PORT` or Railway `PORT`, `VIEWER_PORT`, and optionally `VIEWER_URL`. Set `MINECRAFT_HOME`, `MINECRAFT_CLIENT_HOME`, `FORGE_HOME`, and `MOD_DIRECTORY` when the persistent volume uses a non-default location. `BOT_USERNAME`, host, port, authentication mode, loader, reconnect policy, Forge version, and mod profile can be saved independently per dashboard server profile.

Use two Railway public services/domains: one routes `WEB_PORT` (dashboard/API/WebSocket) and one routes `VIEWER_PORT` (full POV viewer). Set `VIEWER_URL` to the latter public URL. The image installs Node 20, Java 17, Canvas build libraries, and exposes both ports. Start it with:

```bash
npm start
```

Before connecting a Forge profile, run:

```bash
npm run diagnose:forge
```

The diagnostic reports Java, all exact runtime paths, detected Forge version, bridge availability, installed mod filenames, Canvas, Prismarine Viewer, and both ports. Missing components include a specific error code, exact path, and corrective action.

## Viewer limitation

Prismarine Viewer renders a Mineflayer protocol session using real server chunk/entity data. A Java Forge client is not directly renderable by Prismarine Viewer. The Forge bridge must provide a real world/framebuffer stream and telemetry for a Forge POV; until it does, the dashboard explicitly reports Forge POV unavailable rather than showing fake terrain, hearts, inventory, or world state.
