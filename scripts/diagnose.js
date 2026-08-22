#!/usr/bin/env node
const config = require('../src/config/config');
const { runtimeReport } = require('../src/forge/runtime');
const report = runtimeReport(config.forge, config.minecraft);
const available = (name) => { try { require.resolve(name); return true; } catch { return false; } };
const yes = (value) => value ? 'FOUND' : 'MISSING';
console.log('================================\nFORGE CLIENT DIAGNOSTICS\n================================');
console.log(`Java:\n  ${yes(report.java.found)}\n  detected version: ${report.java.version || 'unknown'}\n  Status: ${report.java.ok ? 'OK' : 'JAVA_VERSION_MISMATCH'}`);
console.log(`Minecraft:\n  ${report.version}\n  runtime ${yes(!report.missing.some((x) => x.code === 'MINECRAFT_CLIENT_RUNTIME_MISSING'))}\n  Client JAR: ${yes(require('fs').existsSync(report.required.clientJar))}\n  Version JSON: ${yes(require('fs').existsSync(report.required.metadata))}\n  Libraries: ${yes(require('fs').existsSync(report.required.libraries))}\n  Assets: ${yes(require('fs').existsSync(report.required.assets))}`);
console.log(`Forge:\n  ${yes(report.forgeFiles.length)}\n  Version: ${report.detectedForge || report.forgeVersion || 'unknown'}`);
console.log(`Mods:\n  Directory: ${report.mods}\n  Count: ${report.modFiles.length}\n  Files: ${report.modFiles.join(', ') || 'none'}`);
console.log(`Client bridge:\n  Path: ${report.required.bridge}\n  Status: ${yes(require('fs').existsSync(report.required.bridge))}`);
console.log(`Canvas: ${available('canvas') ? 'OK' : 'CANVAS_RUNTIME_MISSING'}\nViewer: ${available('prismarine-viewer') ? 'OK' : 'VIEWER_RUNTIME_MISSING'}\nWeb: Port ${config.web.port}\nViewer: Port ${config.viewer.port}`);
for (const item of report.missing) console.log(`MISSING:\n  ${item.path}\n${item.code}\nHOW TO FIX:\n  ${item.help}`);
console.log('================================');
