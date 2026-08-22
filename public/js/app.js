import { DashboardSocket } from './websocket.js';
import { setupControls } from './controls.js';
import { setupPov, setViewerUrl, refreshViewer } from './pov.js';
import { renderInventory } from './inventory.js';
import { setupPvp, renderPvp } from './pvp.js';
import { updateStatus, addChat, showError, setupCollapsibles, populateConnectForm } from './ui.js';

const state = {
  connected: false,
  pointerActive: false,
  status: { state: 'offline', position: { x: 0, y: 0, z: 0 } },
  inventory: [],
  pvp: { enabled: false, targets: [] },
  config: {}
};

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!contentType.includes('application/json')) {
    const preview = body.trim().slice(0, 120) || response.statusText;
    throw new Error(`Expected JSON from ${response.url}, got ${contentType || 'unknown content type'}: ${preview}`);
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON from ${response.url}: ${error.message}`);
  }
}

const socket = new DashboardSocket(state, (message) => {
  if (message.type === 'bot_status' || message.type === 'bot_position') {
    state.status = message.data;
    updateStatus(state);
  }

  if (message.type === 'connection_state') {
    state.status = { ...state.status, state: message.data.state, online: ['online', 'connected'].includes(message.data.state) };
    updateStatus(state);
    if (message.data.error) showError(message.data.error);
    if (message.data.state === 'online') refreshViewer();
  }

  if (message.type === 'bot_chat') addChat(message.data);

  if (message.type === 'bot_inventory') {
    state.inventory = message.data;
    renderInventory(message.data);
  }

  if (message.type === 'pvp_status') {
    state.pvp = message.data;
    renderPvp(message.data);
  }

  if (message.type === 'pvp_attack') {
    addChat({ kind: 'system', message: `Attacked ${message.data.username} at ${message.data.distance.toFixed(1)} blocks.` });
  }

  if (message.type === 'error') showError(typeof message.data === 'string' ? message.data : JSON.stringify(message.data));
});

socket.connect();
setupControls(socket);
setupPov(state, socket);
setupPvp(socket, state);
setupCollapsibles();

async function loadConfig() {
  const response = await fetch('/api/config');
  const config = await readJson(response);
  state.config = config;
  populateConnectForm(config);
  setViewerUrl(config);
  document.getElementById('password').style.display = config.authRequired ? 'block' : 'none';
  updateStatus(state);
}

function getPassword() {
  return document.getElementById('password').value;
}

function getConnectOptions() {
  return {
    host: document.getElementById('serverHost').value,
    port: Number(document.getElementById('serverPort').value),
    username: document.getElementById('botUsernameInput').value,
    version: document.getElementById('mcVersion').value,
    auth: document.getElementById('authMode').value,
    loader: document.getElementById('loader').value,
    forgeVersion: document.getElementById('forgeVersion').value,
    modDirectory: document.getElementById('modDirectory').value
  };
}

async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  const password = getPassword();
  if (password) headers['x-dashboard-password'] = password;

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

document.getElementById('connectBtn').addEventListener('click', async () => {
  try {
    const password = getPassword();
    if (password) socket.send({ type: 'auth', password });
    await api('/api/bot/connect', 'POST', getConnectOptions());
  } catch (error) {
    showError(error.message);
  }
});

document.getElementById('disconnectBtn').addEventListener('click', async () => {
  try {
    await api('/api/bot/disconnect', 'POST');
  } catch (error) {
    showError(error.message);
  }
});

document.getElementById('chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  socket.send({ type: 'chat', message: input.value });
  input.value = '';
});

loadConfig().catch((error) => showError(error.message));
updateStatus(state);
renderInventory([]);
renderPvp(state.pvp);
