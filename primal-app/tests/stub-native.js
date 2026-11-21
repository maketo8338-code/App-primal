// Minimal stand-ins for native modules so the pure calculation code runs in Node.
module.exports = { default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, Platform: { OS: 'node', select: (o) => o.default } };
