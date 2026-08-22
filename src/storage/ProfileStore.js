const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ProfileStore {
  constructor(file, fallback) {
    this.file = path.resolve(file);
    this.fallback = fallback;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.data = this.read();
  }

  read() {
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return Array.isArray(saved.profiles) ? saved : { profiles: [this.fallback], selectedId: this.fallback.id };
    } catch {
      const data = { profiles: [this.fallback], selectedId: this.fallback.id };
      this.write(data);
      return data;
    }
  }

  write(data = this.data) {
    fs.writeFileSync(this.file, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  }

  list() { return this.data.profiles.map((profile) => ({ ...profile })); }
  get(id) { return this.data.profiles.find((profile) => profile.id === id) || null; }
  selected() { return this.get(this.data.selectedId) || this.data.profiles[0] || null; }
  select(id) { if (!this.get(id)) return null; this.data.selectedId = id; this.write(); return this.selected(); }
  create(profile) { const record = { ...profile, id: crypto.randomUUID() }; this.data.profiles.push(record); this.write(); return record; }
  update(id, changes) { const profile = this.get(id); if (!profile) return null; Object.assign(profile, changes, { id }); this.write(); return { ...profile }; }
  delete(id) {
    if (this.data.profiles.length === 1) throw new Error('At least one server profile is required.');
    const index = this.data.profiles.findIndex((profile) => profile.id === id);
    if (index < 0) return false;
    this.data.profiles.splice(index, 1);
    if (this.data.selectedId === id) this.data.selectedId = this.data.profiles[0].id;
    this.write(); return true;
  }
}

module.exports = ProfileStore;
