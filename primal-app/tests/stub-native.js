// Stubs for native modules in node tests. AsyncStorage is an in-memory store
// (set __fail = true to simulate a storage read error).
const mem = new Map();
const storage = {
  __mem: mem, __fail: false,
  async getItem(k) { if (storage.__fail) throw new Error('read failed'); return mem.has(k) ? mem.get(k) : null; },
  async setItem(k, v) { mem.set(k, v); },
  async removeItem(k) { mem.delete(k); },
  async multiGet(keys) { if (storage.__fail) throw new Error('read failed'); return keys.map((k) => [k, mem.has(k) ? mem.get(k) : null]); },
  async multiSet(pairs) { for (const [k, v] of pairs) mem.set(k, v); },
  async multiRemove(keys) { for (const k of keys) mem.delete(k); },
};
module.exports = { __esModule: true, default: storage, Platform: { OS: 'node', select: (o) => o.default } };
