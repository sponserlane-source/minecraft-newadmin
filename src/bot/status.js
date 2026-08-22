function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function buildStatus(state, bot, connectOptions = {}, forge = null, telemetry = null) {
  const entity = bot?.entity;

  return {
    state,
    online: state === 'online' || state === 'connected',
    username: bot?.username || connectOptions.username || null,
    uuid: bot?.player?.uuid || bot?.uuid || null,
    health: bot?.health ?? telemetry?.health ?? null,
    food: bot?.food ?? telemetry?.food ?? null,
    armor: bot?.armor ?? telemetry?.armor ?? null,
    position: {
      x: round(entity?.position?.x ?? telemetry?.position?.x),
      y: round(entity?.position?.y ?? telemetry?.position?.y),
      z: round(entity?.position?.z ?? telemetry?.position?.z)
    },
    yaw: round(entity?.yaw ?? telemetry?.yaw),
    pitch: round(entity?.pitch ?? telemetry?.pitch),
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
    forge: forge || null,
    inventoryAvailable: Boolean(bot || telemetry?.inventory),
    selectedSlot: telemetry?.selectedSlot ?? null,
    experienceLevel: telemetry?.experienceLevel ?? null
  };
}

module.exports = { buildStatus };
