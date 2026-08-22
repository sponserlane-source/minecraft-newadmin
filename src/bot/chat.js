class ChatController { constructor(getBot) { this.getBot = getBot; } send(message) { const trimmed = message.trim(); if (!trimmed || trimmed.length > 256) throw new Error('Chat must be 1-256 characters.'); const bot = this.getBot(); if (!bot) throw new Error('Bot is not online.'); bot.chat(trimmed); return trimmed; } }
module.exports = ChatController;
