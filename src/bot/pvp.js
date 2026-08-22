const logger = require('../utils/logger');

class PvpController {
  constructor(getBot, emitStatus) {
    this.getBot = getBot;
    this.emitStatus = emitStatus;
    this.lockEnabled = false;
    this.targetUsername = null;
    this.interval = null;
  }

  listTargets() {
    const bot = this.getBot();
    if (!bot?.players) return [];

    return Object.values(bot.players)
      .filter((player) => player?.username && player.username !== bot.username)
      .map((player) => ({
        username: player.username,
        ping: player.ping ?? null,
        entityId: player.entity?.id ?? null,
        distance: player.entity ? bot.entity.position.distanceTo(player.entity.position) : null
      }))
      .sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE));
  }

  setLock(enabled, targetUsername = null) {
    this.lockEnabled = enabled;
    this.targetUsername = targetUsername || null;

    if (enabled) this.startLockLoop();
    else this.stopLockLoop();

    this.emitStatus?.(this.status());
    return this.status();
  }

  status() {
    return {
      enabled: this.lockEnabled,
      targetUsername: this.targetUsername,
      targets: this.listTargets()
    };
  }

  startLockLoop() {
    if (this.interval) return;
    this.interval = setInterval(() => this.lookAtTarget().catch((error) => {
      logger.warn('PvP target lock failed.', { error: error.message });
    }), 150);
  }

  stopLockLoop() {
    clearInterval(this.interval);
    this.interval = null;
  }

  getTargetEntity() {
    const bot = this.getBot();
    if (!bot?.entities) return null;

    if (this.targetUsername) {
      const player = bot.players?.[this.targetUsername];
      if (player?.entity) return player.entity;
    }

    const candidates = Object.values(bot.entities)
      .filter((entity) => entity.type === 'player' && entity.username && entity.username !== bot.username)
      .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position));

    return candidates[0] || null;
  }

  async lookAtTarget() {
    if (!this.lockEnabled) return null;
    const bot = this.getBot();
    const target = this.getTargetEntity();
    if (!bot || !target) return null;

    await bot.lookAt(target.position.offset(0, target.height || 1.6, 0), true);
    return target;
  }

  async attackLockedTarget() {
    const bot = this.getBot();
    if (!bot) throw new Error('Bot is not online.');
    const target = await this.lookAtTarget();
    if (!target) throw new Error('No PvP target is available.');

    const distance = bot.entity.position.distanceTo(target.position);
    if (distance > 4.2) throw new Error('PvP target is out of melee range.');

    bot.attack(target);
    return { username: target.username || this.targetUsername || 'target', distance };
  }

  stop() {
    this.lockEnabled = false;
    this.targetUsername = null;
    this.stopLockLoop();
  }
}

module.exports = PvpController;
