export function escapeText(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);
}

export function updateStatus(state) {
  const status = state.status || {};
  const server = status.server || state.config || {};

  document.getElementById('statusText').textContent = (status.state || 'offline').toUpperCase();
  document.getElementById('statusDot').classList.toggle('online', Boolean(status.online));
  document.getElementById('botName').textContent = status.username || '—';
  document.getElementById('botState').textContent = status.state || 'offline';
  document.getElementById('serverSummary').textContent = server.host ? `${server.host}:${server.port || 25565}` : '—';
  document.getElementById('health').textContent = `${status.health || 0} / 20`;
  document.getElementById('food').textContent = `${status.food || 0} / 20`;

  const position = status.position || { x: 0, y: 0, z: 0 };
  document.getElementById('position').textContent = `X:${position.x} Y:${position.y} Z:${position.z}`;
  document.getElementById('angles').textContent = `${status.yaw || 0} / ${status.pitch || 0}`;
  document.getElementById('dimension').textContent = status.dimension || '—';
  document.getElementById('gameMode').textContent = status.gameMode || '—';
  document.getElementById('ping').textContent = status.ping ?? '—';
}

export function addChat(line) {
  const element = document.createElement('div');
  element.className = `chat-line ${line.kind === 'sent' ? 'sent' : line.kind === 'system' ? 'system' : ''}`;
  element.innerHTML = `<strong>${escapeText((line.kind || 'server').toUpperCase())}</strong> ${escapeText(line.message)}`;

  const history = document.getElementById('chatHistory');
  history.appendChild(element);
  history.scrollTop = history.scrollHeight;
}

export function showError(message) {
  addChat({ kind: 'system', message });
}

export function setupCollapsibles() {
  document.querySelectorAll('.collapse').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.target).classList.toggle('collapsed'));
  });
}

export function populateConnectForm(config) {
  document.getElementById('serverHost').value = config.minecraftHost || 'localhost';
  document.getElementById('serverPort').value = config.minecraftPort || 25565;
  document.getElementById('botUsernameInput').value = config.botUsername || 'MyBot';
  document.getElementById('mcVersion').value = config.minecraftVersion || '1.20.4';
  document.getElementById('authMode').value = config.authMode || 'offline';
  document.getElementById('loader').value = config.loader || 'vanilla';
  document.getElementById('forgeVersion').value = config.forgeVersion || '';
  document.getElementById('modDirectory').value = config.modDirectory || 'minecraft/mods';

  const notice = document.getElementById('deployNotice');
  notice.textContent = 'Railway mode: the live POV is served through this dashboard connection. Forge POV: unavailable unless a real client stream adapter is configured.';
}
