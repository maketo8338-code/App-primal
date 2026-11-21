// Backup round trip: what is exported is exactly what comes back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, parseBackup } from '../src/backup/backup';
import { normalizePersistedState } from '../src/lib/safeStorage';

const state = {
  profile: { firstName: 'Alex', goal: 'health', activityLevel: 'moderate', age: 32, heightCm: 178, weightKg: 76, sex: 'male', dietStyle: 'classic', onboarded: true,
    targets: { kcal: 2400, protein: 140, carbs: 260, fat: 80, fiber: 30, waterMl: 2500, steps: 8000, sleepH: 8, outdoorMin: 45 }, targetOverrides: {} },
  entries: [{ id: 'e1', date: '2026-01-15', meal: 'breakfast', foodName: 'Oeuf de poule', source: 'core', foodId: 'primal-60', grams: 100, per100: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } }],
  habits: { '2026-01-15': { waterMl: 1200, waterEntries: [{ id: 'w1', ml: 1200 }], steps: 6400, outdoorMin: 30, sleepH: 7.3, activities: [] } },
  favoriteFoods: [],
  notificationPreferences: { hydration: true, meal: false, activity: false, sleep: false, insight: false, quietStart: 22, quietEnd: 7 },
} as never;
const defaults = { profile: { firstName: '', goal: 'health', activityLevel: 'moderate', dietStyle: 'classic', targets: { kcal: 2000, protein: 100, carbs: 250, fat: 70, fiber: 30, waterMl: 2000, steps: 8000, sleepH: 8, outdoorMin: 45 }, targetOverrides: {}, onboarded: false }, targets: { kcal: 2000, protein: 100, carbs: 250, fat: 70, fiber: 30, waterMl: 2000, steps: 8000, sleepH: 8, outdoorMin: 45 }, notificationPreferences: { hydration: false, meal: false, activity: false, sleep: false, insight: false, quietStart: 22, quietEnd: 7 } } as never;

test('a backup reads back identically', () => {
  const file = JSON.stringify(buildBackup(state, { enabled: true, accent: 'glacier' }));
  const parsed = parseBackup(file);
  assert.ok(parsed);
  assert.deepStrictEqual(normalizePersistedState(parsed!.data, defaults), normalizePersistedState(state, defaults));
  assert.deepStrictEqual(parsed!.ambience, { enabled: true, accent: 'glacier' });
});

test('files that are not PRIMAL backups are refused', () => {
  assert.equal(parseBackup('not json'), null);
  assert.equal(parseBackup(JSON.stringify({ hello: 'world' })), null);
  assert.equal(parseBackup(JSON.stringify({ format: 'primal-backup', version: 99, data: {} })), null);
});
