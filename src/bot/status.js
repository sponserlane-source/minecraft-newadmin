function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function buildStatus(state, bot, connectOptions = {}, forge = null) {
  const entity = bot?.entity;

  return {
    state,
    online: state === 'online' || state === 'connected',
    username: bot?.username || connectOptions.username || null,
    uuid: bot?.player?.uuid || bot?.uuid || null,
    health: bot?.health ?? 0,
    food: bot?.food ?? 0,
    position: {
      x: round(entity?.position?.x),
      y: round(entity?.position?.y),
      z: round(entity?.position?.z)
    },
    yaw: round(entity?.yaw ?? 0),
    pitch: round(entity?.pitch ?? 0),
    dimension: bot?.game?.dimension || null,
    gameMode: bot?.game?.gameMode || null,
    ping: bot?.player?.ping ?? null,
    server: {
      host: connectOptions.host || null,
      port: connectOptions.port || null,
      version: connectOptions.version || null,
      auth: connectOptions.auth || null,
      loader: connectOptions.loader || 'vanilla',
      forgeVersion: connectOptions.forgeVersion || null
    },
    forge: forge || null
  };
}

module.exports = { buildStatus };
