#!/usr/bin/env node
/* Downloads the official Forge installer only; it does not bypass Mojang auth or
 * claim that the graphical Forge client can be run headlessly. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const minecraftVersion = process.env.MINECRAFT_VERSION || '1.20.1';
const forgeVersion = process.env.FORGE_VERSION;
const java = process.env.JAVA_PATH || 'java';
const minecraftHome = path.resolve(process.env.MINECRAFT_HOME || 'minecraft');
const forgeHome = path.resolve(process.env.FORGE_HOME || path.join(minecraftHome, 'forge'));
const mods = path.resolve(process.env.MOD_DIRECTORY || path.join(minecraftHome, 'mods'));
const client = path.join(minecraftHome, 'client');

if (minecraftVersion !== '1.20.1') throw new Error(`MINECRAFT_VERSION_MISMATCH: expected 1.20.1, got ${minecraftVersion}`);
if (!/^47\.\d+\.\d+$/.test(forgeVersion || '')) throw new Error('FORGE_VERSION_MISMATCH: set FORGE_VERSION to a Forge 47.x.x build.');
const check = spawnSync(java, ['-version'], { encoding: 'utf8' });
if (check.error || check.status !== 0) throw new Error('JAVA_NOT_FOUND: Java 17 is required.');
console.log(check.stderr.trim());
fs.mkdirSync(forgeHome, { recursive: true });
fs.mkdirSync(mods, { recursive: true });
fs.mkdirSync(client, { recursive: true });
fs.mkdirSync(path.join(minecraftHome, 'config'), { recursive: true });
fs.mkdirSync(path.join(minecraftHome, 'logs'), { recursive: true });
const file = path.join(forgeHome, `forge-${minecraftVersion}-${forgeVersion}-installer.jar`);
const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${minecraftVersion}-${forgeVersion}/forge-${minecraftVersion}-${forgeVersion}-installer.jar`;
function download() { return new Promise((resolve, reject) => {
  https.get(url, (response) => {
    if (response.statusCode !== 200) return reject(new Error(`Forge installer download failed: HTTP ${response.statusCode}`));
    const out = fs.createWriteStream(file); response.pipe(out); out.on('finish', () => out.close(resolve));
  }).on('error', reject);
}); }
(async () => {
  if (!fs.existsSync(file)) await download();
  const installed = spawnSync(java, ['-jar', file, '--installClient', minecraftHome], { stdio: 'inherit' });
  if (installed.status !== 0) throw new Error('FORGE_INSTALL_FAILED: official Forge installer returned an error.');
  console.log(`Forge installer completed. Client runtime directory: ${client}; mods directory: ${mods}`);
  console.log('Install a legitimate Forge-compatible headless client bridge in minecraft/client; it must provide version.json and start.sh.');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
