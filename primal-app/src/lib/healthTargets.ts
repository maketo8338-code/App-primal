import { DayHabits, Profile } from '../types';

function valid(value: number | undefined, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function sleepTargetForAge(age: number | undefined): number {
  if (valid(age, 13, 17)) return 9;
  if (valid(age, 65, 120)) return 8;
  return 8.5;
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
  return Math.max(1500, Math.min(5000, Math.round(((weight * 33) + activityBonus) / 50) * 50));
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
