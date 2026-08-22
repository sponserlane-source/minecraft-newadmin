const allowedControls = new Set(['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint']);
const allowedTypes = new Set([
  'auth',
  'connect_bot',
  'disconnect_bot',
  'control',
  'camera',
  'chat',
  'stop_all',
  'request_status',
  'request_inventory',
  'pvp_lock',
  'pvp_attack',
  'pvp_request_targets'
  ,'pointer'
]);

const hostnamePattern = /^(?=.{1,253}$)(localhost|([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?|\d{1,3}(?:\.\d{1,3}){3})$/;
const usernamePattern = /^[A-Za-z0-9_]{3,16}$/;
const versionPattern = /^\d+\.\d+(?:\.\d+)?$/;
const allowedAuthModes = new Set(['offline', 'microsoft', 'mojang']);

function parseJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
}

function validateConnectOptions(input = {}) {
  const errors = [];
  const options = {};

  if (input.host !== undefined) {
    const host = String(input.host).trim();
    if (!hostnamePattern.test(host)) errors.push('Server host must be a valid hostname or IP address.');
    else options.host = host;
  }

  if (input.port !== undefined) {
    const port = Number(input.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('Server port must be between 1 and 65535.');
    else options.port = port;
  }

  if (input.username !== undefined) {
    const username = String(input.username).trim();
    if (!usernamePattern.test(username)) errors.push('Bot username must be 3-16 characters and use letters, numbers, or underscores.');
    else options.username = username;
  }

  if (input.version !== undefined) {
    const version = String(input.version).trim();
    if (version !== '1.20.1') errors.push('Minecraft version must be exactly 1.20.1.');
    else options.version = version;
  }

  if (input.auth !== undefined) {
    const auth = String(input.auth).trim().toLowerCase();
    if (!allowedAuthModes.has(auth)) errors.push('Authentication mode must be offline, microsoft, or mojang.');
    else options.auth = auth;
  }

  if (input.loader !== undefined) {
    const loader = String(input.loader).trim().toLowerCase();
    if (!['vanilla', 'forge'].includes(loader)) errors.push('Loader must be vanilla or forge.');
    else options.loader = loader;
  }

  if (input.forgeVersion !== undefined) {
    const forgeVersion = String(input.forgeVersion).trim();
    if (forgeVersion && !/^47\.\d+\.\d+$/.test(forgeVersion)) errors.push('Forge version must be a 1.20.1 Forge 47.x.x build.');
    else options.forgeVersion = forgeVersion;
  }

  if (input.modDirectory !== undefined) {
    const modDirectory = String(input.modDirectory).trim();
    if (modDirectory && (modDirectory.includes('\0') || require('path').isAbsolute(modDirectory))) errors.push('Mod directory must be a relative path.');
    else options.modDirectory = modDirectory;
  }

  return errors.length ? { ok: false, error: errors.join(' ') } : { ok: true, options };
}

function validateProfile(input = {}) {
  const result = validateConnectOptions({
    host: input.host, port: input.port, username: input.botUsername, version: input.minecraftVersion,
    loader: input.loader, forgeVersion: input.forgeVersion, auth: input.auth
  });
  const name = String(input.name || '').trim();
  if (!name || name.length > 80) return { ok: false, error: 'Profile name must be 1-80 characters.' };
  if (!result.ok) return result;
  const reconnectDelay = Number(input.reconnectDelay ?? 5000);
  if (![5000, 10000, 20000, 30000, 60000].includes(reconnectDelay)) return { ok: false, error: 'Reconnect delay must be 5, 10, 20, 30, or 60 seconds.' };
  return { ok: true, profile: { name, host: result.options.host, port: result.options.port, minecraftVersion: result.options.version, loader: result.options.loader || 'vanilla', forgeVersion: result.options.forgeVersion || '', botUsername: result.options.username, auth: result.options.auth || 'offline', autoReconnect: Boolean(input.autoReconnect), reconnectDelay, modProfile: String(input.modProfile || 'default').trim() || 'default', displayName: String(input.displayName || '').trim() } };
}

function validateWsMessage(message) {
  if (!message || typeof message !== 'object' || !allowedTypes.has(message.type)) {
    return { ok: false, error: 'Unknown or missing message type.' };
  }

  if (message.type === 'connect_bot') {
    return validateConnectOptions(message.options || {});
  }

  if (message.type === 'control') {
    if (!allowedControls.has(message.action) || typeof message.pressed !== 'boolean') {
      return { ok: false, error: 'Invalid control command.' };
    }
  }

  if (message.type === 'camera') {
    if (!Number.isFinite(message.yaw) || !Number.isFinite(message.pitch)) {
      return { ok: false, error: 'Invalid camera angles.' };
    }
    if (message.pitch < -Math.PI / 2 || message.pitch > Math.PI / 2) {
      return { ok: false, error: 'Camera pitch out of range.' };
    }
  }
  if (message.type === 'pointer' && !['left', 'right'].includes(message.button)) return { ok: false, error: 'Invalid pointer command.' };

  if (message.type === 'chat') {
    if (typeof message.message !== 'string' || message.message.trim().length === 0 || message.message.length > 256) {
      return { ok: false, error: 'Chat must be 1-256 characters.' };
    }
  }

  if (message.type === 'auth' && typeof message.password !== 'string') {
    return { ok: false, error: 'Invalid password.' };
  }

  if (message.type === 'pvp_lock') {
    if (typeof message.enabled !== 'boolean') return { ok: false, error: 'PvP lock enabled must be boolean.' };
    if (message.targetUsername !== undefined && typeof message.targetUsername !== 'string') {
      return { ok: false, error: 'PvP target username must be a string.' };
    }
  }

  return { ok: true };
}

module.exports = {
  allowedControls,
  parseJson,
  validateConnectOptions,
  validateProfile,
  validateWsMessage
};
