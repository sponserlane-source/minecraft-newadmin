const { allowedControls } = require('../utils/validation');
class MovementController {
  constructor(getBot) { this.getBot = getBot; this.active = new Set(); }
  setControl(action, pressed) { if (!allowedControls.has(action)) throw new Error('Unsupported movement action.'); const bot = this.getBot(); if (!bot) throw new Error('Bot is not online.'); bot.setControlState(action, pressed); pressed ? this.active.add(action) : this.active.delete(action); }
  stopAllControls() { const bot = this.getBot(); for (const action of allowedControls) { if (bot) bot.setControlState(action, false); } this.active.clear(); }
}
module.exports = MovementController;
