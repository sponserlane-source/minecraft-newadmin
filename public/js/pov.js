export function setupPov(state, socket) {
  const frame = document.getElementById('povFrame');
  let yaw = 0;
  let pitch = 0;
  let lastSentAt = 0;

  frame.addEventListener('mousemove', (event) => {
    if (!state.pointerActive) return;

    const sensitivity = Number(document.getElementById('sensitivity').value);
    yaw -= event.movementX * sensitivity;
    pitch -= event.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    const now = Date.now();
    if (now - lastSentAt > 45) {
      socket.send({ type: 'camera', yaw, pitch });
      lastSentAt = now;
    }
  });

  frame.addEventListener('click', () => {
    state.pointerActive = true;
    frame.requestPointerLock?.();
  });

  document.addEventListener('pointerlockchange', () => {
    state.pointerActive = document.pointerLockElement === frame;
  });

  document.querySelectorAll('[data-look]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.look;
      if (action === 'center') pitch = 0;
      if (action === 'left') yaw += 0.25;
      if (action === 'right') yaw -= 0.25;
      if (action === 'up') pitch = Math.max(-Math.PI / 2, pitch - 0.2);
      if (action === 'down') pitch = Math.min(Math.PI / 2, pitch + 0.2);
      socket.send({ type: 'camera', yaw, pitch });
    });
  });
}

export function setViewerUrl(config) {
  const frame = document.getElementById('povFrame');
  frame.src = '/pov/';
}

export function refreshViewer() {
  const frame = document.getElementById('povFrame');
  frame.src = `/pov/?reload=${Date.now()}`;
}
