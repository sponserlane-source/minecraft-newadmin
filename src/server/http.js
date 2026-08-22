const express = require('express');
const path = require('path');
const http = require('http');
const createRoutes = require('./routes');
function createHttpServer(config, botManager, viewer, profiles) {
	const app = express();
	app.disable('x-powered-by');
	app.use(express.json({ limit: '32kb' }));
	app.use(createRoutes(config, botManager, profiles));
	app.use((req, res, next) => {
		if (req.url === '/pov' || req.url.startsWith('/pov/')) return viewer.proxyRequest(req, res);
		next();
	});
	app.use(express.static(path.join(__dirname, '../../public'), { extensions: ['html'] }));
	const server = http.createServer(app);
	server.on('upgrade', (req, socket, head) => {
		if (req.url.startsWith('/pov/')) viewer.proxyUpgrade(req, socket, head);
	});
	return server;
}
module.exports = createHttpServer;
