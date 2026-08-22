import { escapeText } from './ui.js';

export function renderPvp(status) {
  const select = document.getElementById('pvpTarget');
  const selected = select.value;
  const targets = status.targets || [];

  select.innerHTML = '<option value="">Nearest player</option>' + targets.map((target) => {
    const distance = target.distance === null ? 'unknown' : `${target.distance.toFixed(1)} blocks`;
    return `<option value="${escapeText(target.username)}">${escapeText(target.username)} (${distance})</option>`;
  }).join('');
  select.value = selected;

  document.getElementById('pvpStatus').textContent = status.enabled
    ? `PvP lock: on${status.targetUsername ? ` (${status.targetUsername})` : ' (nearest player)'}`
    : 'PvP lock: off';
  document.getElementById('pvpLockBtn').textContent = status.enabled ? 'Unlock PvP' : 'Lock PvP';
}

export function setupPvp(socket, state) {
  document.getElementById('refreshTargetsBtn').addEventListener('click', () => {
    socket.send({ type: 'pvp_request_targets' });
  });

  document.getElementById('pvpLockBtn').addEventListener('click', () => {
    const nextEnabled = !state.pvp?.enabled;
    const targetUsername = document.getElementById('pvpTarget').value || undefined;
    socket.send({ type: 'pvp_lock', enabled: nextEnabled, targetUsername });
  });

  document.getElementById('pvpAttackBtn').addEventListener('click', () => {
    socket.send({ type: 'pvp_attack' });
  });
}
