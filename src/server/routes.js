const express = require('express');
const { buildStatus } = require('../bot/status');
const { validateConnectOptions } = require('../utils/validation');

function createRoutes(config, botManager) {
  const router = express.Router();

  const requireAuth = (req, res, next) => {
    if (!config.web.password || req.headers['x-dashboard-password'] === config.web.password) return next();
    res.status(401).json({ error: 'Dashboard password required.' });
  };

  router.get('/health', (req, res) => res.json({ ok: true }));

  router.get('/api/status', (req, res) => res.json({
    state: botManager.state,
    status: buildStatus(botManager.state, botManager.bot, botManager.safeConnectOptions(), botManager.forge.status),
    pvp: botManager.pvp.status()
  }));

  router.get('/api/config', (req, res) => res.json({
    minecraftHost: config.minecraft.host,
    minecraftPort: config.minecraft.port,
    minecraftVersion: config.minecraft.version,
    botUsername: config.minecraft.username,
    authMode: config.minecraft.auth,
    loader: config.minecraft.loader,
    forgeVersion: config.minecraft.forgeVersion,
    modDirectory: config.minecraft.modDirectory,
    authRequired: Boolean(config.web.password)
  }));

  router.get('/api/forge/status', requireAuth, (req, res) => res.json(botManager.forge.getStatus()));

  router.post('/api/bot/connect', requireAuth, (req, res) => {
    const validated = validateConnectOptions(req.body || {});
    if (!validated.ok) return res.status(400).json({ error: validated.error });

    const connectOptions = botManager.connect(validated.options);
    res.json({ ok: true, state: botManager.state, connectOptions });
  });

  router.post('/api/bot/disconnect', requireAuth, (req, res) => {
    botManager.disconnect();
    res.json({ ok: true });
  });

  router.post('/api/bot/stop', requireAuth, (req, res) => {
    botManager.stopAll();
    res.json({ ok: true });
  });

  router.get('/api/bot/inventory', requireAuth, (req, res) => res.json({ items: botManager.inventory.list() }));

  router.get('/api/bot/pvp', requireAuth, (req, res) => res.json(botManager.pvp.status()));

  router.post('/api/bot/pvp/lock', requireAuth, (req, res) => {
    const enabled = Boolean(req.body?.enabled);
    const targetUsername = req.body?.targetUsername ? String(req.body.targetUsername).trim() : null;
    res.json(botManager.pvp.setLock(enabled, targetUsername));
  });

  router.post('/api/bot/pvp/attack', requireAuth, async (req, res) => {
    try {
      res.json({ ok: true, attack: await botManager.pvp.attackLockedTarget() });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createRoutes;
