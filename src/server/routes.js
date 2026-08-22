const express = require('express');
const { buildStatus } = require('../bot/status');
const { validateConnectOptions, validateProfile } = require('../utils/validation');

function createRoutes(config, botManager, profiles) {
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
    authRequired: Boolean(config.web.password), viewerUrl: config.viewer.publicUrl || null, viewerPort: config.viewer.port
  }));

  router.get('/api/servers', requireAuth, (req, res) => res.json({ selectedId: profiles.selected()?.id || null, servers: profiles.list() }));
  router.post('/api/servers', requireAuth, (req, res) => { const valid = validateProfile(req.body || {}); if (!valid.ok) return res.status(400).json({ error: valid.error }); return res.status(201).json(profiles.create(valid.profile)); });
  router.put('/api/servers/:id', requireAuth, (req, res) => { const valid = validateProfile(req.body || {}); if (!valid.ok) return res.status(400).json({ error: valid.error }); const profile = profiles.update(req.params.id, valid.profile); return profile ? res.json(profile) : res.status(404).json({ error: 'Server profile not found.' }); });
  router.delete('/api/servers/:id', requireAuth, (req, res) => { try { if (!profiles.delete(req.params.id)) return res.status(404).json({ error: 'Server profile not found.' }); return res.status(204).end(); } catch (error) { return res.status(400).json({ error: error.message }); } });
  router.post('/api/servers/:id/select', requireAuth, (req, res) => { const profile = profiles.select(req.params.id); if (!profile) return res.status(404).json({ error: 'Server profile not found.' }); botManager.disconnect(); return res.json(profile); });
  const connectProfile = (req, res) => { const profile = profiles.get(req.params.id); if (!profile) return res.status(404).json({ error: 'Server profile not found.' }); profiles.select(profile.id); botManager.disconnect(); botManager.connect({ ...profile, version: profile.minecraftVersion, username: profile.botUsername, auth: profile.auth || config.minecraft.auth }); return res.json({ ok: true, profile }); };
  router.post('/api/servers/:id/connect', requireAuth, connectProfile);
  router.post('/api/servers/:id/disconnect', requireAuth, (req, res) => { botManager.disconnect(); res.json({ ok: true }); });
  router.post('/api/servers/:id/reconnect', requireAuth, connectProfile);

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
