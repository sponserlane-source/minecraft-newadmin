function serializeItem(item, slot) { return { slot, name: item?.name || '', displayName: item?.displayName || item?.name || '', count: item?.count || 0, durability: item?.durabilityUsed ?? null, maxDurability: item?.maxDurability ?? null }; }
class InventoryController { constructor(getBot) { this.getBot = getBot; } list() { const bot = this.getBot(); if (!bot?.inventory) return []; return bot.inventory.slots.map((item, slot) => item ? serializeItem(item, slot) : null).filter(Boolean); } }
module.exports = InventoryController;
