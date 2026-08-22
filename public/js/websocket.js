export class DashboardSocket {
  constructor(state, onMessage) {
    this.state = state;
    this.onMessage = onMessage;
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);

    this.ws.addEventListener('open', () => {
      this.state.connected = true;
      this.send({ type: 'request_status' });
      this.send({ type: 'request_inventory' });
      this.send({ type: 'pvp_request_targets' });
    });

    this.ws.addEventListener('message', (event) => this.onMessage(JSON.parse(event.data)));
    this.ws.addEventListener('close', () => {
      this.state.connected = false;
      setTimeout(() => this.connect(), 1500);
    });
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }
}
