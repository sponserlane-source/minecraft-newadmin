const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const logger = require('../utils/logger');
const { parseJson } = require('../utils/validation');

class ViewerServer {
  constructor(config, botManager, viewer) {
    this.config = config; this.botManager = botManager; this.viewer = viewer;
    const app = express(); app.disable('x-powered-by');
    app.use((req, res, next) => req.url === '/pov' || req.url.startsWith('/pov/') ? viewer.proxyRequest(req, res) : next());
    app.use(express.static(path.join(__dirname, '../../public/viewer'), { extensions: ['html'] }));
    this.server = http.createServer(app);
    this.server.on('upgrade', (req, socket, head) => { if (req.url.startsWith('/pov/')) viewer.proxyUpgrade(req, socket, head); });
    this.wss = new WebSocketServer({ server: this.server, path: '/controls' });
    this.wss.on('connection', (ws) => {
      ws.on('message', async (raw) => {
        const parsed = parseJson(raw); if (!parsed.ok) return;
        const msg = parsed.value;
        try {
          if (msg.type === 'input' && ['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint'].includes(msg.key) && ['down', 'up'].includes(msg.state)) this.botManager.input.set(msg.key, msg.state === 'down');
          else if (msg.type === 'look' && Number.isFinite(msg.dx) && Number.isFinite(msg.dy)) await this.botManager.input.look(msg.dx, msg.dy);
          else if (msg.type === 'click' && ['left', 'right'].includes(msg.button)) this.botManager.input.click(msg.button);
        } catch (error) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'error', message: error.message })); }
      });
      ws.on('close', () => this.botManager.input.releaseAll());
    });
  }
  listen() { this.server.listen(this.config.viewer.port, this.config.viewer.host, () => logger.info(`Fullscreen viewer listening on http://${this.config.viewer.host}:${this.config.viewer.port}`)); }
  close() { this.wss.close(); this.server.close(); }
}
module.exports = ViewerServer;
