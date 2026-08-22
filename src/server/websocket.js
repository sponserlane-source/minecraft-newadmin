const { WebSocketServer } = require('ws');
const logger = require('../utils/logger');
const { buildStatus } = require('../bot/status');
const { parseJson, validateWsMessage } = require('../utils/validation');

function createWebSocketServer(server, config, botManager) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map();

  function send(ws, type, data) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, data }));
  }

  function broadcast(type, data) {
    for (const ws of wss.clients) send(ws, type, data);
  }

  const protectedTypes = new Set([
    'connect_bot',
    'disconnect_bot',
    'control',
    'camera',
    'chat',
    'stop_all',
    'request_inventory',
    'pvp_lock',
    'pvp_attack',
    'pvp_request_targets'
  ]);

  wss.on('connection', (ws) => {
    logger.info('WebSocket connected.');
    clients.set(ws, {
      count: 0,
      resetAt: Date.now() + 10000,
      authenticated: !config.web.password
    });

    send(ws, 'connection_state', {
      state: botManager.state,
      authRequired: Boolean(config.web.password),
      connectOptions: botManager.safeConnectOptions()
    });
    send(ws, 'bot_status', buildStatus(botManager.state, botManager.bot, botManager.safeConnectOptions(), botManager.forge.status));
    send(ws, 'forge_status', botManager.forge.status);
    send(ws, 'pvp_status', botManager.pvp.status());

    ws.on('message', async (raw) => {
      const meta = clients.get(ws);
      const now = Date.now();

      if (now > meta.resetAt) {
        meta.count = 0;
        meta.resetAt = now + 10000;
      }

      if (++meta.count > 250) return send(ws, 'error', 'Rate limit exceeded.');

      const parsed = parseJson(raw);
      if (!parsed.ok) return send(ws, 'error', parsed.error);

      const valid = validateWsMessage(parsed.value);
      if (!valid.ok) return send(ws, 'error', valid.error);

      const msg = parsed.value;

      if (msg.type === 'auth') {
        meta.authenticated = Boolean(config.web.password) && msg.password === config.web.password;
        return send(ws, meta.authenticated ? 'auth_ok' : 'error', meta.authenticated ? { ok: true } : 'Invalid dashboard password.');
      }

      if (protectedTypes.has(msg.type) && !meta.authenticated) {
        return send(ws, 'error', 'Authenticate before controlling the bot.');
      }

      try {
        if (msg.type === 'connect_bot') botManager.connect(valid.options);
        if (msg.type === 'disconnect_bot') botManager.disconnect();
        if (msg.type === 'control') botManager.movement.setControl(msg.action, msg.pressed);
        if (msg.type === 'camera') await botManager.camera.look(msg.yaw, msg.pitch);
        if (msg.type === 'chat') {
          const sent = botManager.chat.send(msg.message);
          broadcast('bot_chat', { kind: 'sent', message: sent, at: Date.now() });
        }
        if (msg.type === 'stop_all') botManager.stopAll();
        if (msg.type === 'request_status') send(ws, 'bot_status', buildStatus(botManager.state, botManager.bot, botManager.safeConnectOptions(), botManager.forge.status));
        if (msg.type === 'request_inventory') send(ws, 'bot_inventory', botManager.inventory.list());
        if (msg.type === 'pvp_lock') broadcast('pvp_status', botManager.pvp.setLock(msg.enabled, msg.targetUsername));
        if (msg.type === 'pvp_attack') {
          const attack = await botManager.pvp.attackLockedTarget();
          broadcast('pvp_status', botManager.pvp.status());
          send(ws, 'pvp_attack', attack);
        }
        if (msg.type === 'pvp_request_targets') send(ws, 'pvp_status', botManager.pvp.status());
      } catch (error) {
        logger.warn('WebSocket command failed.', { error: error.message });
        send(ws, 'error', error.message);
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket disconnected; releasing movement.');
      botManager.stopAll();
      clients.delete(ws);
    });
  });

  botManager.on('connection_state', (data) => broadcast('connection_state', data));
  botManager.on('bot_status', (data) => broadcast('bot_status', data));
  botManager.on('bot_position', (data) => broadcast('bot_position', data));
  botManager.on('bot_inventory', (data) => broadcast('bot_inventory', data));
  botManager.on('bot_chat', (data) => broadcast('bot_chat', data));
  botManager.on('pvp_status', (data) => broadcast('pvp_status', data));
  botManager.on('error_message', (data) => broadcast('error', data));
  botManager.on('forge_status', (data) => broadcast('forge_status', data));

  return wss;
}

module.exports = createWebSocketServer;
