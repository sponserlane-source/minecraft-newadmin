const CONTROLS = new Set(['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint']);
class InputManager {
  constructor(botManager) { this.botManager = botManager; this.state = Object.fromEntries([...CONTROLS].map((key) => [key, false])); }
  set(key, down) {
    if (!CONTROLS.has(key) || typeof down !== 'boolean') throw new Error('Unsupported input control.');
    if (this.state[key] === down) return;
    this.state[key] = down;
    if (this.botManager.isForge()) this.botManager.forge.move(key, down);
    else this.botManager.movement.setControl(key, down);
  }
  look(dx, dy) { return this.botManager.lookRelative(dx, dy); }
  click(button) { if (!['left', 'right'].includes(button)) throw new Error('Unsupported pointer button.'); return this.botManager.isForge() ? (button === 'left' ? this.botManager.forge.attack() : this.botManager.forge.useItem()) : null; }
  selectHotbar(slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot > 8) throw new Error('Hotbar slot must be between 0 and 8.');
    if (this.botManager.isForge()) return this.botManager.forge.selectHotbar(slot);
    const bot = this.botManager.bot;
    if (!bot) throw new Error('Bot is not online.');
    bot.setQuickBarSlot(slot);
  }
  releaseAll() { for (const key of CONTROLS) { if (this.state[key]) { try { this.set(key, false); } catch { this.state[key] = false; } } } this.botManager.movement.stopAllControls(); }
}
module.exports = InputManager;
