const logger = require('../utils/logger');
const httpProxy = require('http-proxy');

class ViewerManager {
  constructor(config) {
    this.config = config;
    this.active = false;
    this.bot = null;
    this.proxy = httpProxy.createProxyServer({ target: `http://127.0.0.1:${config.viewer.port}` });
    this.proxy.on('error', (error, request, response) => {
      logger.warn('Viewer proxy unavailable.', { error: error.message });
      if (response && !response.headersSent) response.writeHead(503, { 'content-type': 'text/plain' });
      if (response && !response.writableEnded) response.end('Viewer is starting.');
    });
  }

  start(bot) {
    if (this.active || !bot) return;
    try {
      const { mineflayer: viewer } = require('prismarine-viewer');
      viewer(bot, { port: this.config.viewer.port, prefix: '/pov', firstPerson: true });
      this.bot = bot;
      this.active = true;
      logger.info(`Prismarine viewer listening on ${this.config.viewer.port}`);
    } catch (error) { logger.error('Viewer failed to start.', { error: error.message }); }
  }

  stop() {
    if (this.bot?.viewer?.close) this.bot.viewer.close();
    this.bot = null;
    this.active = false;
    logger.info('Prismarine viewer stopped.');
  }

  proxyRequest(request, response) { this.proxy.web(request, response); }
  proxyUpgrade(request, socket, head) { this.proxy.ws(request, socket, head); }
}

module.exports = ViewerManager;
