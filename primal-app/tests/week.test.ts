// Weekly review: averages only logged days, finds the best day and recurring gaps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeekSummary } from '../src/week/weekSummary';
import type { DayHabits, JournalEntry, Profile } from '../src/types';

const profile = { firstName: 'A', goal: 'health', activityLevel: 'moderate', dietStyle: 'classic', age: 32, heightCm: 178, weightKg: 76, sex: 'male', onboarded: true,
  targets: { kcal: 2400, protein: 140, carbs: 260, fat: 80, fiber: 30, waterMl: 2500, steps: 8000, sleepH: 8, outdoorMin: 45 }, targetOverrides: {} } as unknown as Profile;
const egg = (date: string, grams: number): JournalEntry => ({ id: date + grams, date, meal: 'lunch', foodName: 'Oeuf', source: 'core', grams, per100: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, vitC: 0, iron: 1.8 } } as unknown as JournalEntry);
const entries: Record<string, JournalEntry[]> = { '2026-11-15': [egg('2026-11-15', 200)], '2026-11-18': [egg('2026-11-18', 1100)], '2026-11-21': [egg('2026-11-21', 400)] };
const empty = { waterMl: 0, waterEntries: [], steps: 0, outdoorMin: 0, activities: [] } as unknown as DayHabits;

test('weekly review', () => {
  const w = buildWeekSummary('2026-11-21', (d) => entries[d] ?? [], () => empty, profile);
  assert.equal(w.days.length, 7);
  assert.equal(w.days[6].date, '2026-11-21');
  assert.equal(w.loggedDays, 3);
  assert.ok(w.averageScore !== undefined);
  assert.equal(w.previousAverage, undefined);
  assert.equal(w.best?.date, '2026-11-18');
  assert.equal(w.proteinDays, 1);
  assert.ok(w.gaps.some((g) => g.key === 'vitC' && g.days === 3));
});
