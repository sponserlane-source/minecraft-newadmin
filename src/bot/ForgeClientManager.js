const EventEmitter = require('events');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FORGE_REQUIRED = 'This server has mods that require Forge to be installed on the client.';

function diagnose(text) {
  const message = String(text || '');
  const value = message.toLowerCase();
  if (message.includes(FORGE_REQUIRED)) return 'FORGE_CLIENT_REQUIRED';
  if (/missing required mod|missing mods?/.test(value)) return 'FORGE_MOD_MISSING';
  if (/mod mismatch|incompatible mod/.test(value)) return 'FORGE_MOD_MISMATCH';
  if (/forge.+version|version.+forge/.test(value)) return 'FORGE_VERSION_MISMATCH';
  if (/minecraft.+version|unsupported client/.test(value)) return 'MINECRAFT_VERSION_MISMATCH';
  if (/auth|access token|invalid session|not authenticated/.test(value)) return 'AUTHENTICATION_FAILED';
  return null;
}

class ForgeClientManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.process = null;
    this.status = { state: 'OFFLINE', java: null, clientMods: 0, modFiles: [], missingRequiredMods: [], pov: 'FORGE_POV_UNAVAILABLE' };
  }

  emitStatus(state, extra = {}) {
    this.status = { ...this.status, state, ...extra };
    this.emit('status', this.status);
  }

  async verifyJava() {
    return new Promise((resolve) => {
      const child = spawn(this.config.javaPath, ['-version']);
      let output = '';
      child.stderr.on('data', (data) => { output += data; });
      child.on('error', () => resolve({ ok: false, output: 'JAVA_NOT_FOUND' }));
      child.on('close', (code) => resolve(code === 0 ? { ok: true, output: output.trim() } : { ok: false, output: 'JAVA_NOT_FOUND' }));
    });
  }

  getModFiles(modDirectory) {
    try { return fs.readdirSync(modDirectory).filter((file) => file.toLowerCase().endsWith('.jar')).sort(); } catch { return []; }
  }

  async start(profile) {
    if (this.process) return this.status;
    const forge = { ...this.config, forgeVersion: profile.forgeVersion || this.config.forgeVersion, modDirectory: profile.modDirectory || this.config.modDirectory };
    if (profile.version !== '1.20.1') {
      this.emitStatus('ERROR', { diagnostic: 'MINECRAFT_VERSION_MISMATCH' });
      return this.status;
    }
    if (!forge.forgeVersion) {
      this.emitStatus('ERROR', { diagnostic: 'FORGE_VERSION_MISMATCH', message: 'Forge 47.x version is required.' });
      return this.status;
    }
    if ((profile.auth || 'offline') !== 'offline') {
      this.emitStatus('ERROR', { diagnostic: 'AUTHENTICATION_FAILED', message: 'Forge profiles in this deployment are restricted to offline-mode authentication.' });
      return this.status;
    }
    this.emitStatus('STARTING', { diagnostic: null, minecraftVersion: profile.version, forgeVersion: forge.forgeVersion });
    const java = await this.verifyJava();
    if (!java.ok) {
      this.emitStatus('ERROR', { diagnostic: 'JAVA_NOT_FOUND', message: 'Java 17 is required for Forge 1.20.1.' });
      return this.status;
    }
    const modFiles = this.getModFiles(forge.modDirectory);
    this.emitStatus('LOADING', { java: java.output, clientMods: modFiles.length, modFiles, modDirectory: forge.modDirectory });
    if (!fs.existsSync(this.config.clientCommand)) {
      this.emitStatus('ERROR', { diagnostic: 'FORGE_CLIENT_RUNTIME_MISSING', message: `Forge launcher script not found: ${this.config.clientCommand}` });
      return this.status;
    }
    const environment = { ...process.env, MINECRAFT_HOST: profile.host, MINECRAFT_PORT: String(profile.port), MINECRAFT_VERSION: profile.version, FORGE_VERSION: forge.forgeVersion, MOD_DIRECTORY: path.resolve(forge.modDirectory), BOT_USERNAME: profile.botUsername || profile.username, MINECRAFT_AUTH: profile.auth || 'offline' };
    this.emitStatus('CONNECTING');
    this.process = spawn(this.config.clientCommand, [], { env: environment, stdio: ['pipe', 'pipe', 'pipe'] });
    const consume = (chunk) => this.consumeOutput(chunk.toString());
    this.process.stdout.on('data', consume);
    this.process.stderr.on('data', consume);
    this.process.on('error', (error) => this.emitStatus('ERROR', { message: error.message }));
    this.process.on('exit', (code) => {
      this.process = null;
      if (!['STOPPING', 'KICKED'].includes(this.status.state)) this.emitStatus('ERROR', { message: `Forge client exited with code ${code}.` });
      else this.emitStatus('OFFLINE');
    });
    return this.status;
  }

  consumeOutput(text) {
    const diagnostic = diagnose(text);
    if (diagnostic) this.emitStatus('KICKED', { diagnostic, kickMessage: text.trim() });
    else if (/forge.*handshake|handshake.*forge/i.test(text)) this.emitStatus('CONNECTING');
    else if (/joining world|loading terrain/i.test(text)) this.emitStatus('SPAWNED');
    else if (/joined the game|connection established|forge_client_connected/i.test(text)) this.emitStatus('CONNECTED');
    this.emit('log', text.trim());
  }

  stop() { if (!this.process) return this.emitStatus('OFFLINE'); this.emitStatus('STOPPING'); this.process.kill('SIGTERM'); }
  restart(profile) { this.stop(profile); return this.start(profile); }
  getStatus() { return { ...this.status }; }
  getProcess() { return this.process; }

  sendCommand(command) {
    if (!this.process?.stdin?.writable) throw new Error('Forge control bridge is not available.');
    const allowed = new Set(['chat', 'move', 'look', 'jump', 'attack', 'useItem']);
    if (!command || !allowed.has(command.type)) throw new Error('Unsupported Forge bridge command.');
    this.process.stdin.write(`${JSON.stringify(command)}\n`);
  }
  sendChat(message) { return this.sendCommand({ type: 'chat', message }); }
  move(action, pressed) { return this.sendCommand({ type: 'move', action, pressed: Boolean(pressed) }); }
  look(yaw, pitch) { return this.sendCommand({ type: 'look', yaw, pitch }); }
  jump(pressed) { return this.sendCommand({ type: 'jump', pressed: Boolean(pressed) }); }
  attack() { return this.sendCommand({ type: 'attack' }); }
  useItem() { return this.sendCommand({ type: 'useItem' }); }
}

module.exports = ForgeClientManager;
module.exports.diagnose = diagnose;
