require('dotenv').config();
const logger = require('../utils/logger');

function int(name, fallback) {
  const value = Number.parseInt(process.env[name] || `${fallback}`, 10);
  return Number.isFinite(value) ? value : fallback;
}

const config = {
  minecraft: {
    host: process.env.MINECRAFT_HOST || 'localhost',
    port: int('MINECRAFT_PORT', 25565),
    version: process.env.MINECRAFT_VERSION || '1.20.4',
    username: process.env.BOT_USERNAME || 'MyBot',
    auth: process.env.MINECRAFT_AUTH || 'offline',
    reconnectDelay: int('BOT_RECONNECT_DELAY', 5000),
    maxReconnectAttempts: int('MAX_RECONNECT_ATTEMPTS', 5),
    loader: (process.env.MINECRAFT_LOADER || 'vanilla').toLowerCase(),
    forgeVersion: process.env.FORGE_VERSION || '',
    modDirectory: process.env.MOD_DIRECTORY || ''
  },
  forge: {
    javaPath: process.env.JAVA_PATH || 'java',
    minecraftHome: process.env.MINECRAFT_HOME || 'minecraft',
    clientHome: process.env.MINECRAFT_CLIENT_HOME || 'minecraft/client',
    forgeHome: process.env.FORGE_HOME || 'minecraft/forge',
    forgeVersion: process.env.FORGE_VERSION || '',
    modDirectory: process.env.MOD_DIRECTORY || 'minecraft/mods',
    clientCommand: process.env.FORGE_CLIENT_COMMAND || 'scripts/start-forge-client.sh'
  },
  web: {
    host: process.env.WEB_HOST || '0.0.0.0',
    port: int('WEB_PORT', int('PORT', 3000)),
    password: process.env.DASHBOARD_PASSWORD || '12345'
  },
  viewer: {
    port: int('VIEWER_PORT', 3007)
  },
  logLevel: process.env.LOG_LEVEL || 'info'
};

logger.setLevel(config.logLevel);

module.exports = config;
