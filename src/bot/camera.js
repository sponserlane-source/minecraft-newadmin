const HALF_PI = Math.PI / 2;
class CameraController {
  constructor(getBot) { this.getBot = getBot; }
  async look(yaw, pitch) { const bot = this.getBot(); if (!bot) throw new Error('Bot is not online.'); const clampedPitch = Math.max(-HALF_PI, Math.min(HALF_PI, pitch)); await bot.look(yaw, clampedPitch, true); }
  async center() { const bot = this.getBot(); if (!bot) throw new Error('Bot is not online.'); await bot.look(bot.entity.yaw || 0, 0, true); }
}
module.exports = CameraController;
