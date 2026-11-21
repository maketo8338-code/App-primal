// Characterisation tests: freeze the results of PRIMAL's calculations so that any
// refactor or bug fix can prove it did not change what users see.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join } from 'node:path';
import type { DayHabits, JournalEntry, Profile } from '../src/types';
import { estimateBmr, estimateEnergy, calculateDailyNutritionTargets, targetsWithDynamicMacros, calculateGoalCalories, estimateBaselineTdee } from '../src/lib/energy';
import { completeTotalForEntries, micronutrientStatuses, scoreTotalsForEntries, totalsForEntries, formatNutrientValue, fmtAmount, pct, shiftDate } from '../src/lib/nutrition';
import { computeDayScore } from '../src/lib/scoring';
import { optimizeDay } from '../src/lib/optimizer';
import { nutritionAdvice } from '../src/lib/advice';
import { hydrationTargetForDay, totalHydrationMl, waterFromEntries, sleepTargetForAge } from '../src/lib/healthTargets';
import { calculateProgression } from '../src/lib/progression';
import { validateProfileFields, parseProfileNumber, hasCompleteProfile } from '../src/lib/profileValidation';
import { calculateDietTargets } from '../src/lib/dietStyles';
import { estimateActivityCalories, knownActiveCalories, activityDuration } from '../src/lib/activitySync';
import { formatSleepDuration, parseSleepDurationInput, sleepRegularity } from '../src/lib/sleepSync';
import { normalizePersistedState } from '../src/lib/safeStorage';
import { searchCore } from '../src/lib/foodSources';

const SNAP = join(process.cwd(), 'tests', 'golden.json.gz');
const D = '2026-01-15';
const per = (kcal: number, protein: number, carbs: number, fat: number, extra = {}) => ({ kcal, protein, carbs, fat, ...extra });
const TARGETS = { kcal: 2400, protein: 140, carbs: 260, fat: 80, fiber: 30, waterMl: 2500, steps: 8000, sleepH: 8, outdoorMin: 45 };
const base = { firstName: 'T', targets: TARGETS, targetOverrides: {}, onboarded: true } as const;

const PROFILES: Profile[] = [];
for (const sex of ['male', 'female', 'unspecified'] as const)
  for (const age of [17, 52])
    for (const goal of ['maintain', 'lose', 'gain', 'health', 'personalized'] as const)
      for (const activityLevel of ['low', 'high'] as const)
        PROFILES.push({ ...base, sex, age, heightCm: sex === 'female' ? 165 : 178, weightKg: sex === 'female' ? 62 : 80, goal, activityLevel, dietStyle: 'classic', targetWeightKg: goal === 'lose' ? 70 : goal === 'gain' ? 86 : undefined, customGoalAdjustmentKcal: goal === 'personalized' ? -250 : undefined } as Profile);
PROFILES.push({ ...base, goal: 'health', activityLevel: 'moderate' } as Profile); // incomplete profile
PROFILES.push({ ...base, sex: 'male', age: 40, heightCm: 180, weightKg: 90, bodyFatPercent: 22, goal: 'lose', activityLevel: 'high', usualStepsPerDay: 12000, walkingMinutesPerDay: 40, workActivity: 'active', recurringActivities: [{ id: 'r', name: 'Musculation', sessionsPerWeek: 3, minutes: 60, intensity: 'intense' }] } as Profile);

const ENTRIES: JournalEntry[] = [
  { id: 'e1', date: D, meal: 'breakfast', foodName: 'Œufs', source: 'core', grams: 120, per100: per(143, 12.6, 0.7, 9.5, { vitB12: 0.9, vitD: 2, iron: 1.8, fiber: 0, water: 76, selenium: 30, iodine: 50 }) },
  { id: 'e2', date: D, meal: 'breakfast', foodName: 'Myrtilles', source: 'core', grams: 100, per100: per(57, 0.7, 14.5, 0.3, { vitC: 9.7, fiber: 2.4, water: 84, vitK: 19 }) },
  { id: 'e3', date: D, meal: 'lunch', foodName: 'Saumon', source: 'core', grams: 150, per100: per(208, 20, 0, 13, { omega3: 2.3, vitD: 11, vitB12: 3.2, fiber: 0, water: 64, potassium: 363, magnesium: 27 }) },
  { id: 'e4', date: D, meal: 'lunch', foodName: 'Patate douce', source: 'core', grams: 200, per100: per(86, 1.6, 20, 0.1, { vitA: 709, fiber: 3, potassium: 337, water: 77, vitC: 2.4, magnesium: 25 }) },
  { id: 'e5', date: D, meal: 'dinner', foodName: 'Lentilles', source: 'core', grams: 180, per100: per(116, 9, 20, 0.4, { iron: 3.3, fiber: 7.9, vitB9: 181, magnesium: 36, zinc: 1.3 }) },
];
const HABITS: DayHabits[] = [
  { waterMl: 0, waterEntries: [], steps: 0, outdoorMin: 0, sleepH: 0, activities: [] },
  { waterMl: 1500, waterEntries: [{ id: 'w', ml: 1500 }], steps: 9000, outdoorMin: 50, sleepH: 7.5, activities: [{ id: 'a', name: 'Course à pied', minutes: 40, intensity: 'intense' }] },
  { waterMl: 800, waterEntries: [{ id: 'w', ml: 800 }], steps: 3000, outdoorMin: 10, sleepH: 5, activities: [{ id: 'b', name: 'Marche', minutes: 20 }] },
];
const round = (v: unknown): unknown => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : Array.isArray(v) ? v.map(round) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)])) : v;

function compute() {
  const out: Record<string, unknown> = {};
  const dayLists = [[], ENTRIES.slice(0, 2), ENTRIES];
  out.profiles = PROFILES.map((p) => {
    const perDay = HABITS.flatMap((h) => dayLists.map((entries) => {
      const totals = scoreTotalsForEntries(entries);
      const daily = calculateDailyNutritionTargets(p, h, totals);
      const targets = { ...targetsWithDynamicMacros(p, daily.macros), waterMl: hydrationTargetForDay(p, h) };
      return { daily, targets, score: computeDayScore(totals, h, targets), energy: estimateEnergy(p, h, totals), micros: entries.length === ENTRIES.length ? micronutrientStatuses(entries, p).map((m) => [m.key, m.percent, m.target, m.amount, m.complete]) : undefined };
    }));
    return { bmr: estimateBmr(p), tdee: estimateBaselineTdee(p), goal: calculateGoalCalories(p, 2300), diet: ['classic', 'primal', 'lowCarb', 'keto', 'mediterranean'].map((s) => calculateDietTargets(p, s as never)), sleep: sleepTargetForAge(p.age), perDay };
  });
  out.totals = { all: totalsForEntries(ENTRIES), score: scoreTotalsForEntries(ENTRIES), kcal: completeTotalForEntries(ENTRIES, 'kcal'), water: totalHydrationMl(800, waterFromEntries(ENTRIES)) };
  out.optimizer = [[], ENTRIES.slice(0, 1), ENTRIES].map((e) => optimizeDay(e, TARGETS));
  out.advice = [[], ENTRIES].map((e) => nutritionAdvice(e, { targets: TARGETS, hydrationTotal: 900, limit: 4 }));
  out.progression = calculateProgression(ENTRIES, { [D]: HABITS[1], [shiftDate(D, -1)]: HABITS[2] }, TARGETS);
  out.validation = ['', '0', '17', '250', 'abc', '72,5'].map((v) => [parseProfileNumber(v), validateProfileFields({ age: v, heightCm: v, weightKg: v } as never)]);
  out.complete = PROFILES.slice(0, 3).map(hasCompleteProfile);
  out.activity = [['Course à pied', 30, 70, 'intense'], ['Marche', 60, 60, 'douce'], ['Natation', 45, undefined, 'modérée']].map(([n, m, w, i]) => estimateActivityCalories(n as string, m as number, w as number, i as never));
  out.habits = HABITS.map((h) => [knownActiveCalories(h), activityDuration(h)]);
  out.sleep = [formatSleepDuration(7.3), parseSleepDurationInput('7h45'), parseSleepDurationInput('8'), sleepRegularity([7, 7.5, 6, 8])];
  out.format = [formatNutrientValue(1234.567, 'mg'), formatNutrientValue(undefined, 'g'), fmtAmount('vitD', 2.5), fmtAmount('kcal', 1980.4), pct(50, 200), pct(undefined, 10)];
  out.storage = normalizePersistedState({ profile: { firstName: 'X', age: '200', weightKg: 70 }, entries: [ENTRIES[0], { bad: true }], habits: { [D]: HABITS[1] } }, { profile: PROFILES[0], targets: TARGETS, notificationPreferences: { hydration: false, meal: false, activity: false, sleep: false, insight: false, quietStart: 22, quietEnd: 7 } } as never);
  out.search = ['pomme', 'saumon', 'faisselle', 'pizza', 'oeuf'].map((q) => searchCore(q).slice(0, 5).map((f) => f.id));
  return round(JSON.parse(JSON.stringify(out)));
}

test('calculation results are unchanged', () => {
  const now = compute();
  if (process.env.UPDATE_GOLDEN || !existsSync(SNAP)) { writeFileSync(SNAP, gzipSync(JSON.stringify(now), { level: 9 })); return; }
  assert.deepStrictEqual(now, JSON.parse(gunzipSync(readFileSync(SNAP)).toString('utf8')));
});
