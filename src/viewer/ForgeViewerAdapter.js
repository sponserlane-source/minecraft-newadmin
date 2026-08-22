class ForgeViewerAdapter {
  constructor() { this.status = 'FORGE_POV_UNAVAILABLE'; }
  start() { return this.status; }
  stop() { return this.status; }
  getStatus() { return this.status; }
}

module.exports = ForgeViewerAdapter;
