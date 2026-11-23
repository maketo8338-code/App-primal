// Journal storage: split by month, v1 migration, never overwritten after a failed read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPersisted, savePersisted } from '../src/lib/persist';

const store = AsyncStorage as unknown as { __mem: Map<string, string>; __fail: boolean };
const state = (n: number) => ({
  profile: { firstName: 'A' }, favoriteFoods: [], notificationPreferences: {},
  entries: Array.from({ length: n }, (_, i) => ({ id: `e${i}`, date: `2026-${String((i % 3) + 9).padStart(2, '0')}-1${i % 9}` })),
  habits: { '2026-10-12': { waterMl: 500 }, '2026-11-03': { weight: 80 } },
});

test('v1 data is read, then saved split by month and the v1 value removed', async () => {
  store.__mem.clear(); store.__fail = false;
  store.__mem.set('primal.state.v1', JSON.stringify(state(9)));
  const loaded = await loadPersisted();
  assert.equal(loaded.ok, true);
  await savePersisted(loaded.data as never, new Map());
  assert.equal(store.__mem.has('primal.state.v1'), false);
  assert.deepEqual([...store.__mem.keys()].filter((k) => k.includes('.m.')).sort(), ['primal.state.v2.m.2026-09', 'primal.state.v2.m.2026-10', 'primal.state.v2.m.2026-11']);
  const again = await loadPersisted();
  const data = again.data as ReturnType<typeof state>;
  assert.equal(data.entries.length, 9);
  assert.deepEqual(data.habits['2026-11-03'], { weight: 80 });
});

test('only the month that changed is rewritten', async () => {
  const cache = new Map<string, string>();
  const s = state(9); await savePersisted(s, cache);
  const before = new Map(store.__mem);
  s.entries.push({ id: 'new', date: '2026-11-20' }); await savePersisted(s, cache);
  assert.equal(store.__mem.get('primal.state.v2.m.2026-09'), before.get('primal.state.v2.m.2026-09'));
  assert.notEqual(store.__mem.get('primal.state.v2.m.2026-11'), before.get('primal.state.v2.m.2026-11'));
});

test('a failed read is reported, so the app does not save over the data', async () => {
  store.__fail = true;
  const r = await loadPersisted();
  store.__fail = false;
  assert.equal(r.ok, false);
  assert.equal(r.data, null);
});
