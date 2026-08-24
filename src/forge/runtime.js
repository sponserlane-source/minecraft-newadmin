const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MC_VERSION = '1.20.1';
const FORGE_VERSION = /^47\.\d+\.\d+$/;

function ensureDirectories(config) {
  for (const directory of [config.minecraftHome, config.forgeHome, config.modDirectory,
    path.join(config.minecraftHome, 'config'), path.join(config.minecraftHome, 'logs')]) {
    fs.mkdirSync(path.resolve(directory), { recursive: true });
  }
}

function javaReport(javaPath) {
  const result = spawnSync(javaPath, ['-version'], { encoding: 'utf8' });
  const output = `${result.stderr || ''}${result.stdout || ''}`.trim();
  const match = output.match(/version\s+"([^"]+)"/);
  return { ok: result.status === 0 && /^17(?:\.|$)/.test(match?.[1] || ''), found: result.status === 0,
    version: match?.[1] || null, detail: output.split('\n')[0] || null };
}

function runtimeReport(config, options = {}) {
  ensureDirectories(config);
  const version = options.minecraftVersion || MC_VERSION;
  const forgeVersion = options.forgeVersion || config.forgeVersion || '';
  const client = path.resolve(config.clientHome);
  const forgeHome = path.resolve(config.forgeHome);
  const mods = path.resolve(options.modDirectory || config.modDirectory);
  const required = {
    metadata: path.join(client, 'versions', MC_VERSION, `${MC_VERSION}.json`),
    clientJar: path.join(client, 'versions', MC_VERSION, `${MC_VERSION}.jar`),
    libraries: path.join(client, 'libraries'), assets: path.join(client, 'assets', 'objects'),
    bridge: path.resolve(config.clientLauncher)
  };
  const modFiles = fs.existsSync(mods) ? fs.readdirSync(mods).filter((x) => x.toLowerCase().endsWith('.jar')).sort() : [];
  const forgeFiles = fs.existsSync(forgeHome) ? fs.readdirSync(forgeHome, { recursive: true }).filter((x) => /forge-1\.20\.1-47\.\d+\.\d+.*\.jar$/i.test(x)) : [];
  const detectedForge = forgeFiles.map((x) => x.match(/forge-1\.20\.1-(47\.\d+\.\d+)/i)?.[1]).find(Boolean) || null;
  const missing = [];
  if (version !== MC_VERSION) missing.push({ code: 'MINECRAFT_VERSION_MISMATCH', path: MC_VERSION, help: 'Configure every Forge profile for Minecraft 1.20.1.' });
  for (const [name, file] of Object.entries(required)) if (!fs.existsSync(file) || (name === 'bridge' && !(fs.statSync(file).mode & 0o111))) missing.push({ code: name === 'bridge' ? 'HEADLESS_CLIENT_BRIDGE_MISSING' : 'MINECRAFT_CLIENT_RUNTIME_MISSING', path: file, help: `Put the legitimate ${name}${name === 'bridge' ? ' (and make it executable)' : ''} at this exact path.` });
  if (!FORGE_VERSION.test(forgeVersion)) missing.push({ code: 'FORGE_VERSION_MISMATCH', path: forgeHome, help: 'Set FORGE_VERSION/profile Forge version to a 47.x.x build.' });
  if (!forgeFiles.length) missing.push({ code: 'FORGE_RUNTIME_MISSING', path: forgeHome, help: 'Put the Forge 1.20.1 47.x runtime JARs under this directory.' });
  if (forgeVersion && detectedForge && forgeVersion !== detectedForge) missing.push({ code: 'FORGE_VERSION_MISMATCH', path: forgeHome, help: `Configured ${forgeVersion}; supplied runtime is ${detectedForge}.` });
  return { java: javaReport(config.javaPath), version, forgeVersion, detectedForge, required, forgeHome, mods, modFiles, forgeFiles, missing,
    ok: missing.length === 0 };
}

module.exports = { MC_VERSION, FORGE_VERSION, ensureDirectories, javaReport, runtimeReport };
