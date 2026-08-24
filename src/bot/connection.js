const EventEmitter = require('events');
const mineflayer = require('mineflayer');
const logger = require('../utils/logger');
const MovementController = require('./movement');
const CameraController = require('./camera');
const ChatController = require('./chat');
const InventoryController = require('./inventory');
const PvpController = require('./pvp');
const { buildStatus } = require('./status');
const ForgeClientManager = require('./ForgeClientManager');
const InputManager = require('../controls/InputManager');

class BotManager extends EventEmitter {
  constructor(config, viewer) {
    super();
    this.config = config;
    this.viewer = viewer;
    this.bot = null;
    this.state = 'offline';
    this.manualDisconnect = false;
    this.reconnectTimer = null;
    this.lastConnectOptions = { ...config.minecraft };
    this.statusTimer = null;
    this.reconnectAttempts = 0;
    this.forgeTelemetry = null;
    this.forge = new ForgeClientManager(config.forge);
    this.forge.on('status', (status) => {
      this.emit('forge_status', status);
      this.setState(status.state.toLowerCase(), status.message || status.diagnostic);
    });
    this.forge.on('log', (message) => message && this.emit('bot_chat', { kind: 'system', message: `[Forge] ${message}`, at: Date.now() }));
    this.forge.on('bridge_event', (event) => {
      if (event.type === 'telemetry') {
        this.forgeTelemetry = event.data || null;
        if (Array.isArray(event.data?.inventory)) this.emit('bot_inventory', event.data.inventory);
        this.emitStatus();
      }
      if (event.type === 'chat') this.emit('bot_chat', { kind: event.kind === 'bot' ? 'sent' : event.kind === 'server' ? 'server' : 'system', message: String(event.message || ''), at: Date.now() });
    });

    this.movement = new MovementController(() => this.bot);
    this.camera = new CameraController(() => this.bot);
    this.chat = new ChatController(() => this.bot);
    this.inventory = new InventoryController(() => this.bot);
    this.pvp = new PvpController(() => this.bot, (status) => this.emit('pvp_status', status));
    this.input = new InputManager(this);
  }

  setState(state, error) {
    this.state = state;
    this.emit('connection_state', {
      state,
      error,
      reconnectDelay: this.config.minecraft.reconnectDelay,
      connectOptions: this.safeConnectOptions()
    });
    this.emitStatus();
  }

  safeConnectOptions() {
    const { host, port, version, username, auth, loader, forgeVersion, modDirectory } = this.lastConnectOptions;
    return { host, port, version, username, auth, loader, forgeVersion, modDirectory };
  }

  emitStatus() {
    this.emit('bot_status', buildStatus(this.state, this.bot, this.safeConnectOptions(), this.forge.status, this.forgeTelemetry));
    this.emit('pvp_status', this.pvp.status());
  }

  emitInventory() {
    this.emit('bot_inventory', this.bot ? this.inventory.list() : (this.forgeTelemetry?.inventory || []));
  }

  connect(overrides = {}) {
    if (this.bot || ['connecting', 'online', 'reconnecting', 'starting_forge', 'loading_mods', 'forge_handshake', 'spawning', 'connected'].includes(this.state)) {
      this.emitStatus();
      return this.safeConnectOptions();
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    this.lastConnectOptions = { ...this.lastConnectOptions, ...overrides };
    if (this.lastConnectOptions.loader === 'forge') {
      this.forge.start({ ...this.lastConnectOptions, botUsername: this.lastConnectOptions.username });
      return this.safeConnectOptions();
    }
    this.setState(this.state === 'reconnecting' ? 'reconnecting' : 'connecting');

    const options = {
      host: this.lastConnectOptions.host,
      port: this.lastConnectOptions.port,
      username: this.lastConnectOptions.username,
      version: this.lastConnectOptions.version,
      auth: this.lastConnectOptions.auth
    };

    logger.info('Bot connecting', {
      host: options.host,
      port: options.port,
      username: options.username,
      version: options.version,
      auth: options.auth
    });

    this.bot = mineflayer.createBot(options);
    this.attachHandlers(this.bot);
    return this.safeConnectOptions();
  }

  attachHandlers(bot) {
    bot.once('spawn', () => {
      this.setState('online');
      logger.info('Bot connected.');
      this.viewer.start(bot);
      this.startStatusLoop();
      this.emitInventory();
    });

    bot.on('health', () => this.emitStatus());
    bot.on('move', () => this.emit('bot_position', buildStatus(this.state, bot, this.safeConnectOptions())));
    bot.on('heldItemChanged', () => this.emitInventory());
    bot.on('windowOpen', () => this.emitInventory());
    bot.on('playerJoined', () => this.emit('pvp_status', this.pvp.status()));
    bot.on('playerLeft', () => this.emit('pvp_status', this.pvp.status()));
    bot.on('messagestr', (message) => this.emit('bot_chat', { kind: 'server', message, at: Date.now() }));
    bot.on('error', (error) => {
      logger.error('Mineflayer error.', { error: error.message });
      this.emit('error_message', error.message || 'Mineflayer error.');
    });
    bot.once('kicked', (reason) => {
      logger.warn('Bot kicked.', { reason: String(reason) });
      this.emit('bot_chat', { kind: 'system', message: `Kicked: ${String(reason)}`, at: Date.now() });
      if (/mods? that require forge|forge to be installed on the client|forge required/i.test(String(reason))) this.startForgeForRequiredServer();
    });
    bot.once('end', (reason) => this.handleEnd(reason));
  }

  startForgeForRequiredServer() {
    if (this.lastConnectOptions.loader === 'forge' || this.forge.getProcess()) return;
    if (!this.config.forge.forgeVersion || !/^47\.\d+\.\d+$/.test(this.config.forge.forgeVersion)) {
      this.setState('forge_required', 'FORGE REQUIRED: select/configure a Forge 47.x.x profile to join this server.');
      return;
    }
    this.input.releaseAll();
    this.lastConnectOptions = { ...this.lastConnectOptions, loader: 'forge', forgeVersion: this.config.forge.forgeVersion };
    this.setState('forge_required', 'FORGE REQUIRED — Starting Forge 1.20.1…');
    this.forge.start({ ...this.lastConnectOptions, botUsername: this.lastConnectOptions.username });
  }

  startStatusLoop() {
    clearInterval(this.statusTimer);
    this.statusTimer = setInterval(() => {
      this.emitStatus();
      this.emitInventory();
    }, 1000);
  }

  handleEnd(reason) {
    logger.warn('Bot disconnected.', { reason });
    this.input.releaseAll();
    this.pvp.stop();
    clearInterval(this.statusTimer);
    this.viewer.stop();
    this.bot = null;

    if (this.forge.getProcess()) return;
    if (this.manualDisconnect) {
      this.setState('offline');
      return;
    }

    this.scheduleReconnect('Bot disconnected. Reconnecting soon.');
  }

  scheduleReconnect(message) {
    if (this.reconnectTimer) return;
    this.reconnectAttempts += 1;
    if (!this.lastConnectOptions.autoReconnect || this.reconnectAttempts > this.config.minecraft.maxReconnectAttempts) {
      this.setState('error', 'Connection failed repeatedly. Check server version and configuration.');
      return;
    }
    this.setState('reconnecting', message);
    logger.info('Scheduling reconnect.', { delay: this.config.minecraft.reconnectDelay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.config.minecraft.reconnectDelay);
  }

  disconnect() {
    this.manualDisconnect = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.input.releaseAll();
    this.pvp.stop();

    if (this.lastConnectOptions.loader === 'forge') this.forge.stop(this.lastConnectOptions);
    else if (this.bot) this.bot.quit('Dashboard disconnect');
    else this.setState('offline');
  }

  stopAll() {
    this.input.releaseAll();
    this.pvp.stop();
    this.emitStatus();
  }

  shutdown() {
    this.manualDisconnect = true;
    this.disconnect();
  }

  isForge() { return this.lastConnectOptions.loader === 'forge'; }
  async lookRelative(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 500 || Math.abs(dy) > 500) throw new Error('Invalid camera movement.');
    if (this.isForge()) return this.forge.lookRelative(dx, dy);
    const entity = this.bot?.entity;
    if (!entity) throw new Error('Bot is not online.');
    return this.camera.look((entity.yaw || 0) - dx * 0.004, (entity.pitch || 0) - dy * 0.004);
  }
  async look(yaw, pitch) {
    if (this.isForge()) return this.forge.look(yaw, pitch);
    return this.camera.look(yaw, pitch);
  }
}

module.exports = BotManager;
