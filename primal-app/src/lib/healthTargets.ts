import { DayHabits, Profile } from '../types';

function valid(value: number | undefined, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Sleep duration guidelines by age (National Sleep Foundation, 2015):
 * « recommended » range and the wider « may be appropriate » range.
 * No official guideline separates men and women, so sex is not used.
 */
export interface SleepGuideline { recMin: number; recMax: number; okMin: number; okMax: number }
export function sleepGuidelineForAge(age: number | undefined): SleepGuideline {
  if (valid(age, 6, 13)) return { recMin: 9, recMax: 11, okMin: 7, okMax: 12 };
  if (valid(age, 14, 17)) return { recMin: 8, recMax: 10, okMin: 7, okMax: 11 };
  if (valid(age, 18, 25)) return { recMin: 7, recMax: 9, okMin: 6, okMax: 11 };
  if (valid(age, 65, 120)) return { recMin: 7, recMax: 8, okMin: 5, okMax: 9 };
  return { recMin: 7, recMax: 9, okMin: 6, okMax: 10 }; // 26–64 and unknown age
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

export function baseHydrationTarget(profile: Pick<Profile, 'weightKg' | 'activityLevel'>): number {
  if (!valid(profile.weightKg, 25, 300)) return 0;
  const weight = profile.weightKg as number;
  const activityBonus = profile.activityLevel == null ? 0 : profile.activityLevel === 'high' ? 350 : profile.activityLevel === 'low' ? 0 : 150;
  return Math.max(1500, Math.min(5000, Math.round(((weight * HYDRATION_ML_PER_KG.medium) + activityBonus) / 50) * 50));
}

/** Personal hydration level (Hydratation screen): ml of total water (drinks + food) per kg. */
export const HYDRATION_ML_PER_KG = { low: 27, medium: 30, high: 35 } as const;
export type HydrationLevel = keyof typeof HYDRATION_ML_PER_KG;

/** Daily water target for a chosen level (same activity bonus as the default target). */
export function hydrationTargetForLevel(profile: Profile, level: HydrationLevel): number {
  if (!valid(profile.weightKg, 25, 300)) return 0;
  const activityBonus = profile.activityLevel == null ? 0 : profile.activityLevel === 'high' ? 350 : profile.activityLevel === 'low' ? 0 : 150;
  return Math.max(1500, Math.min(5000, Math.round(((profile.weightKg as number) * HYDRATION_ML_PER_KG[level] + activityBonus) / 50) * 50));
}

export function activityHydrationBonus(habits: Pick<DayHabits, 'activities'>): number {
  const rate = { douce: 3, 'modérée': 5, intense: 7 };
  return Math.round(habits.activities.reduce((sum, activity) => sum + activity.minutes * (rate[activity.intensity || 'modérée']), 0) / 50) * 50;
}

export function hydrationTargetForDay(profile: Profile, habits?: Pick<DayHabits, 'activities'>): number {
  const override = profile.targetOverrides?.waterMl;
  if (typeof override === 'number' && Number.isFinite(override)) return override;
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
