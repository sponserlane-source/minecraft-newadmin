const config = require('./config/config');
const logger = require('./utils/logger');
const ViewerManager = require('./viewer/viewer');
const BotManager = require('./bot/bot');
const createHttpServer = require('./server/http');
const createWebSocketServer = require('./server/websocket');
const viewer = new ViewerManager(config);
const botManager = new BotManager(config, viewer);
const server = createHttpServer(config, botManager, viewer);
createWebSocketServer(server, config, botManager);
server.listen(config.web.port, config.web.host, () => logger.info(`Dashboard listening on http://${config.web.host}:${config.web.port}`));
async function shutdown(signal) { logger.info(`Received ${signal}; shutting down.`); botManager.shutdown(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown); process.on('uncaughtException', (e) => logger.error('Uncaught exception.', { error: e.message })); process.on('unhandledRejection', (e) => logger.error('Unhandled rejection.', { error: e?.message || String(e) }));
