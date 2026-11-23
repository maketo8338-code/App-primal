import { DayHabits, Profile } from '../types';

function valid(value: number | undefined, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Sleep by age. recMin–recMax = default ideal range (score 100): set at the upper,
 * « optimal » part of the National Sleep Foundation recommendations (2015), which
 * describe what is enough for most people rather than what is best.
 * okMin–okMax = how far the user can move their own range.
 * No official guideline separates men and women, so sex is not used.
 */
export interface SleepGuideline { recMin: number; recMax: number; okMin: number; okMax: number }
export function sleepGuidelineForAge(age: number | undefined): SleepGuideline {
  if (valid(age, 6, 12)) return { recMin: 9.5, recMax: 11, okMin: 9, okMax: 12 };
  if (valid(age, 13, 17)) return { recMin: 8.5, recMax: 10, okMin: 8, okMax: 11 };
  if (valid(age, 18, 25)) return { recMin: 7.5, recMax: 9, okMin: 7, okMax: 11 };
  if (valid(age, 65, 120)) return { recMin: 7.5, recMax: 8.5, okMin: 7, okMax: 9.5 };
  return { recMin: 7.5, recMax: 9, okMin: 7, okMax: 10.5 }; // 26–64 and unknown age
}

/** Default start of the ideal sleep range (the recommended minimum for the age). */
export function sleepTargetForAge(age: number | undefined): number {
  return sleepGuidelineForAge(age).recMin;
}

export function outdoorTargetForActivity(level: Profile['activityLevel']): number {
  if (level === 'low') return 120;
  if (level === 'high') return 180;
  return 150;
}

/** Default water target: the middle level (33 ml per kg of body weight). */
export function baseHydrationTarget(profile: Pick<Profile, 'weightKg' | 'activityLevel'>): number {
  if (!valid(profile.weightKg, 25, 300)) return 0;
  return Math.round(((profile.weightKg as number) * HYDRATION_ML_PER_KG.medium) / 50) * 50;
}

/** Hydration level (Hydratation screen): ml of total water (drinks + food) per kg, always between 30 and 36. */
export const HYDRATION_ML_PER_KG = { low: 30, medium: 33, high: 36 } as const;
export type HydrationLevel = keyof typeof HYDRATION_ML_PER_KG;
const HYDRATION_MIN_PER_KG = HYDRATION_ML_PER_KG.low; const HYDRATION_MAX_PER_KG = HYDRATION_ML_PER_KG.high;

function roundTo50(value: number): number { return Math.round(value / 50) * 50; }

/** Daily water target for a chosen level. */
export function hydrationTargetForLevel(profile: Profile, level: HydrationLevel): number {
  if (!valid(profile.weightKg, 25, 300)) return 0;
  return roundTo50((profile.weightKg as number) * HYDRATION_ML_PER_KG[level]);
}

export function activityHydrationBonus(habits: Pick<DayHabits, 'activities'>): number {
  const rate = { douce: 3, 'modérée': 5, intense: 7 };
  return Math.round(habits.activities.reduce((sum, activity) => sum + activity.minutes * (rate[activity.intensity || 'modérée']), 0) / 50) * 50;
}

export function hydrationTargetForDay(profile: Profile, habits?: Pick<DayHabits, 'activities'>): number {
  const override = profile.targetOverrides?.waterMl;
  // A saved target is kept inside the 30–36 ml/kg range (older, freer settings are brought back into it).
  if (typeof override === 'number' && Number.isFinite(override) && valid(profile.weightKg, 25, 300)) {
    const weight = profile.weightKg as number;
    return Math.min(roundTo50(weight * HYDRATION_MAX_PER_KG), Math.max(roundTo50(weight * HYDRATION_MIN_PER_KG), override));
  }
  return baseHydrationTarget(profile) + (habits ? activityHydrationBonus(habits) : 0);
}

export interface FoodWaterTotal {
  amount?: number;
  knownEntries: number;
  totalEntries: number;
}

export function waterFromEntries(entries: Array<{ grams: number; per100: { water?: number } }>): FoodWaterTotal {
  let amount = 0;
  let knownEntries = 0;
  entries.forEach((entry) => {
    const water = entry.per100.water;
    if (typeof water !== 'number' || !Number.isFinite(water)) return;
    amount += (water * entry.grams) / 100;
    knownEntries += 1;
  });
  return { amount: knownEntries ? Math.round(amount) : undefined, knownEntries, totalEntries: entries.length };
}

export function totalHydrationMl(directWaterMl: number, foodWater: FoodWaterTotal): number {
  return Math.max(0, directWaterMl) + (foodWater.amount || 0);
}
