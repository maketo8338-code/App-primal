// Weigh-ins: with ≥ 7 days of calories + weight, the target follows the real expenditure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateEnergy } from '../src/lib/energy';
import { buildEnergyHistory } from '../src/weight/energyHistory';
import { shiftDate } from '../src/lib/nutrition';
import type { DayHabits, JournalEntry, Profile } from '../src/types';

const profile = { firstName: 'A', goal: 'maintain', activityLevel: 'moderate', dietStyle: 'classic', age: 30, heightCm: 178, weightKg: 80, sex: 'male', onboarded: true,
  targets: { kcal: 2400, protein: 140, carbs: 260, fat: 80, fiber: 30, waterMl: 2500, steps: 8000, sleepH: 8, outdoorMin: 45 }, targetOverrides: {} } as unknown as Profile;
const empty = (weight?: number) => ({ waterMl: 0, waterEntries: [], steps: 0, outdoorMin: 0, sleepH: 0, activities: [], ...(weight ? { weight } : {}) }) as unknown as DayHabits;
const TODAY = '2026-11-22';
const food = (date: string, id: string, kcal: number) => ({ id: date + id, date, meal: 'lunch', foodName: id, source: 'core', grams: 100, per100: { kcal, protein: 0, carbs: 0, fat: 0 } } as unknown as JournalEntry);
const meal = (date: string, kcal: number) => [food(date, 'a', kcal / 2), food(date, 'b', kcal / 2)];

function history(dailyKcal: number, startKg: number, endKg: number) {
  const days = Array.from({ length: 21 }, (_, i) => shiftDate(TODAY, i - 21));
  const weighIns: Record<string, number> = { [days[0]]: startKg, [days[7]]: (startKg * 2 + endKg) / 3, [days[14]]: (startKg + endKg * 2) / 3, [days[20]]: endKg };
  return buildEnergyHistory(TODAY, (d) => (days.includes(d) ? meal(d, dailyKcal) : []), (d) => empty(weighIns[d]));
}

test('weekly weigh-ins are carried forward', () => {
  const h = history(2600, 80, 80);
  assert.equal(h.length, 21);
  assert.ok(h.every((d) => d.weightKg === 80 || d.weightKg !== undefined));
});
test('stable weight → target ≈ calories actually eaten', () => {
  const e = estimateEnergy(profile, empty(), {}, history(2600, 80, 80));
  assert.equal(e.tdee, 2600);
});
test('gaining weight on « maintain » lowers the target', () => {
  const stable = estimateEnergy(profile, empty(), {}, history(2600, 80, 80)).targetCalories;
  const gaining = estimateEnergy(profile, empty(), {}, history(2600, 80, 81)).targetCalories;
  assert.ok(gaining <= stable - 200, `${gaining} should be well below ${stable}`);
});
test('a day with a single food logged is not trusted', () => {
  const days = Array.from({ length: 10 }, (_, i) => shiftDate(TODAY, i - 10));
  const h = buildEnergyHistory(TODAY, (d) => (days.includes(d) ? [food(d, 'a', 900)] : []), (d) => empty(d === days[0] ? 80 : undefined));
  assert.ok(h.every((d) => d.consumedKcal === undefined));
});
test('no weigh-in → formulas, and a man never gets below 1 500 kcal', () => {
  const e = estimateEnergy({ ...profile, goal: 'lose', weightKg: 45, heightCm: 150, age: 70 } as Profile, empty(), {}, []);
  assert.ok(e.targetCalories >= 1500);
});
