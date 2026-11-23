import { ActivityIntensity, ActivitySource, BiologicalSex, DayHabits, DietStyleId, Food, FoodSource, GoalId, JournalEntry, ManualActivity, MealId, NutrientKey, Nutrients, NotificationPreferences, Profile, RawNutrientValue, RecurringActivity, Targets, WorkActivityLevel } from '../types';

export const STORAGE_LIMITS = {
  text: 240,
  foodName: 240,
  grams: 100000,
  waterMl: 1000000,
  steps: 1000000,
  outdoorMin: 1440,
  sleepHours: 24,
  activityMinutes: 1440,
  distanceKm: 100000,
  kcal: 1000000,
} as const;

const NUTRIENT_KEYS: NutrientKey[] = [
  'kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'satFat', 'omega3', 'water',
  'vitA', 'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB7', 'vitB9', 'vitB12', 'vitC', 'vitD', 'vitE', 'vitK',
  'calcium', 'magnesium', 'potassium', 'sodium', 'iron', 'zinc', 'copper', 'manganese', 'selenium', 'iodine', 'phosphorus',
];
const MEALS: MealId[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const FOOD_SOURCES: FoodSource[] = ['core', 'usda', 'off', 'ciqual'];
const INTENSITIES: ActivityIntensity[] = ['douce', 'modérée', 'intense'];
const ACTIVITY_SOURCES: ActivitySource[] = ['manual', 'device'];
const DIET_STYLES: DietStyleId[] = ['classic', 'primal', 'lowCarb', 'keto', 'custom', 'mediterranean'];
const GOALS: GoalId[] = ['maintain', 'lose', 'gain', 'personalized', 'health'];
const SEXES: BiologicalSex[] = ['female', 'male', 'unspecified'];
const WORK_LEVELS: WorkActivityLevel[] = ['sedentary', 'standing', 'active'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number = STORAGE_LIMITS.text): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function finite(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return undefined;
  return value;
}

function integer(value: unknown, min: number, max: number): number | undefined {
  const parsed = finite(value, min, max);
  return parsed === undefined ? undefined : Math.round(parsed);
}

function dateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return typeof value === 'string' && values.includes(value as T) ? value as T : undefined;
}

export function normalizeNutrients(value: unknown): Nutrients {
  const source = isRecord(value) ? value : {};
  const result: Nutrients = {};
  NUTRIENT_KEYS.forEach((key) => {
    const parsed = finite(source[key], 0, 1_000_000_000);
    if (parsed !== undefined) result[key] = parsed;
  });
  return result;
}

function normalizeRawCiqual(value: unknown): Record<string, RawNutrientValue> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, RawNutrientValue> = {};
  Object.keys(value).slice(0, 200).forEach((key) => {
    const raw = value[key];
    if (raw === null) result[key] = null;
    else if (typeof raw === 'string') result[key] = raw.slice(0, STORAGE_LIMITS.text);
    else if (typeof raw === 'number' && Number.isFinite(raw)) result[key] = raw;
  });
  return result;
}

export function normalizeFood(value: unknown): Food | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, STORAGE_LIMITS.text);
  const name = text(value.name, STORAGE_LIMITS.foodName);
  const source = oneOf(value.source, FOOD_SOURCES);
  const category = text(value.category, STORAGE_LIMITS.text);
  const portionLabel = text(value.portionLabel, STORAGE_LIMITS.text);
  const portionGrams = finite(value.portionGrams, 0.001, STORAGE_LIMITS.grams);
  if (!id || !name || !source || !category || !portionLabel || portionGrams === undefined) return null;
  const result: Food = { id, source, name, category, portionLabel, portionGrams, per100: normalizeNutrients(value.per100) };
  const brand = text(value.brand, STORAGE_LIMITS.text);
  if (brand) result.brand = brand;
  const ciqualCode = integer(value.ciqualCode, 0, 1_000_000_000);
  if (ciqualCode !== undefined) result.ciqualCode = ciqualCode;
  const ciqualRaw = normalizeRawCiqual(value.ciqualRaw);
  if (ciqualRaw) result.ciqualRaw = ciqualRaw;
  return result;
}

export function normalizeJournalEntry(value: unknown): JournalEntry | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, STORAGE_LIMITS.text);
  const date = dateKey(value.date) ? value.date : undefined;
  const meal = oneOf(value.meal, MEALS);
  const foodName = text(value.foodName, STORAGE_LIMITS.foodName);
  const source = oneOf(value.source, FOOD_SOURCES);
  const grams = finite(value.grams, 1, STORAGE_LIMITS.grams);
  if (!id || !date || !meal || !foodName || !source || grams === undefined) return null;
  const result: JournalEntry = { id, date, meal, foodName, source, grams, per100: normalizeNutrients(value.per100) };
  const brand = text(value.brand, STORAGE_LIMITS.text);
  const foodId = text(value.foodId, STORAGE_LIMITS.text);
  if (brand) result.brand = brand;
  if (foodId) result.foodId = foodId;
  return result;
}

export function normalizeManualActivity(value: unknown): ManualActivity | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, STORAGE_LIMITS.text);
  const name = text(value.name, STORAGE_LIMITS.text);
  const minutes = finite(value.minutes, 1, STORAGE_LIMITS.activityMinutes);
  if (!id || !name || minutes === undefined) return null;
  const result: ManualActivity = { id, name, minutes };
  const intensity = oneOf(value.intensity, INTENSITIES);
  const kcal = finite(value.kcal, 0, STORAGE_LIMITS.kcal);
  const distanceKm = finite(value.distanceKm, 0, STORAGE_LIMITS.distanceKm);
  const source = oneOf(value.source, ACTIVITY_SOURCES);
  if (intensity) result.intensity = intensity;
  if (kcal !== undefined) result.kcal = kcal;
  if (distanceKm !== undefined) result.distanceKm = distanceKm;
  if (source) result.source = source;
  return result;
}

function normalizeWaterEntry(value: unknown): { id: string; ml: number } | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, STORAGE_LIMITS.text);
  const ml = finite(value.ml, 1, STORAGE_LIMITS.waterMl);
  return id && ml !== undefined ? { id, ml } : null;
}

export function normalizeDayHabits(value: unknown): DayHabits {
  const source = isRecord(value) ? value : {};
  const waterEntries = Array.isArray(source.waterEntries) ? source.waterEntries.map(normalizeWaterEntry).filter((entry): entry is { id: string; ml: number } => entry !== null) : [];
  const activities = Array.isArray(source.activities) ? source.activities.map(normalizeManualActivity).filter((activity): activity is ManualActivity => activity !== null) : [];
  const result: DayHabits = {
    waterMl: finite(source.waterMl, 0, STORAGE_LIMITS.waterMl) ?? 0,
    waterEntries,
    steps: finite(source.steps, 0, STORAGE_LIMITS.steps) ?? 0,
    outdoorMin: finite(source.outdoorMin, 0, STORAGE_LIMITS.outdoorMin) ?? 0,
    sleepH: finite(source.sleepH, 0, STORAGE_LIMITS.sleepHours) ?? 0,
    activities,
  };
  const distanceKm = finite(source.distanceKm, 0, STORAGE_LIMITS.distanceKm);
  const weight = finite(source.weight, 0, 500);
  const bedtime = text(source.sleepBedtime, 5);
  const wakeTime = text(source.sleepWakeTime, 5);
  const sleepSource = oneOf(source.sleepSource, ['manual', 'device'] as const);
  if (distanceKm !== undefined) result.distanceKm = distanceKm;
  if (weight !== undefined) result.weight = weight;
  if (bedtime) result.sleepBedtime = bedtime;
  if (wakeTime) result.sleepWakeTime = wakeTime;
  if (sleepSource) result.sleepSource = sleepSource;
  return result;
}

export function normalizeTargets(value: unknown, fallback: Targets): Targets {
  const source = isRecord(value) ? value : {};
  return {
    kcal: finite(source.kcal, 0, 100000) ?? fallback.kcal,
    protein: finite(source.protein, 0, 100000) ?? fallback.protein,
    carbs: finite(source.carbs, 0, 100000) ?? fallback.carbs,
    fat: finite(source.fat, 0, 100000) ?? fallback.fat,
    fiber: finite(source.fiber, 0, 100000) ?? fallback.fiber,
    waterMl: finite(source.waterMl, 0, STORAGE_LIMITS.waterMl) ?? fallback.waterMl,
    steps: finite(source.steps, 0, STORAGE_LIMITS.steps) ?? fallback.steps,
    sleepH: finite(source.sleepH, 0, STORAGE_LIMITS.sleepHours) ?? fallback.sleepH,
    outdoorMin: finite(source.outdoorMin, 0, STORAGE_LIMITS.outdoorMin) ?? fallback.outdoorMin,
    ...((finite(source.sleepMaxH, 0, STORAGE_LIMITS.sleepHours) ?? fallback.sleepMaxH) !== undefined ? { sleepMaxH: finite(source.sleepMaxH, 0, STORAGE_LIMITS.sleepHours) ?? fallback.sleepMaxH } : {}),
  };
}

export function normalizeTargetOverrides(value: unknown): Partial<Targets> {
  const source = isRecord(value) ? value : {};
  const result: Partial<Targets> = {};
  const waterMl = finite(source.waterMl, 0, STORAGE_LIMITS.waterMl);
  const steps = finite(source.steps, 0, STORAGE_LIMITS.steps);
  const sleepH = finite(source.sleepH, 0, STORAGE_LIMITS.sleepHours);
  const outdoorMin = finite(source.outdoorMin, 0, STORAGE_LIMITS.outdoorMin);
  const sleepMaxH = finite(source.sleepMaxH, 0, STORAGE_LIMITS.sleepHours);
  if (sleepMaxH !== undefined) result.sleepMaxH = sleepMaxH;
  if (waterMl !== undefined) result.waterMl = waterMl;
  if (steps !== undefined) result.steps = steps;
  if (sleepH !== undefined) result.sleepH = sleepH;
  if (outdoorMin !== undefined) result.outdoorMin = outdoorMin;
  return result;
}

export function normalizeProfile(value: unknown, defaults: Profile, defaultTargets: Targets): Profile {
  const source = isRecord(value) ? value : {};
  const result: Profile = {
    ...defaults,
    firstName: text(source.firstName, 120) ?? defaults.firstName,
    goal: oneOf(source.goal, GOALS) ?? defaults.goal,
    activityLevel: oneOf(source.activityLevel, ['low', 'moderate', 'high'] as const) ?? defaults.activityLevel,
    dietStyle: oneOf(source.dietStyle, DIET_STYLES) ?? defaults.dietStyle,
    targets: normalizeTargets(source.targets, defaultTargets),
    targetOverrides: normalizeTargetOverrides(source.targetOverrides),
    onboarded: source.onboarded === true,
  };
  const avatarUri = text(source.avatarUri, 4096);
  const age = finite(source.age, 13, 120);
  const heightCm = finite(source.heightCm, 100, 230);
  const weightKg = finite(source.weightKg, 25, 300);
  const targetWeightKg = finite(source.targetWeightKg, 25, 300);
  const customGoalAdjustmentKcal = finite(source.customGoalAdjustmentKcal, -10000, 10000);
  const usualStepsPerDay = finite(source.usualStepsPerDay, 0, 100000);
  const walkingMinutesPerDay = finite(source.walkingMinutesPerDay, 0, 1440);
  const bodyFatPercent = finite(source.bodyFatPercent, 2, 70);
  const sex = oneOf(source.sex, SEXES);
  const workActivity = oneOf(source.workActivity, WORK_LEVELS);
  const dietPref = text(source.dietPref, STORAGE_LIMITS.text);
  const recurringActivities: RecurringActivity[] = Array.isArray(source.recurringActivities) ? source.recurringActivities.map((item) => {
    const recurring = isRecord(item) ? item : {};
    return {
      id: text(recurring.id, STORAGE_LIMITS.text) || '',
      name: text(recurring.name, STORAGE_LIMITS.text) || '',
      minutes: finite(recurring.minutes, 1, STORAGE_LIMITS.activityMinutes) || 0,
      sessionsPerWeek: integer(recurring.sessionsPerWeek, 1, 14) || 1,
      intensity: oneOf(recurring.intensity, INTENSITIES) || 'modérée',
    };
  }).filter((item): item is RecurringActivity => Boolean(item.id && item.name && item.minutes > 0)) : [];
  if (avatarUri && /^(file|content|ph|assets-library|https?):/i.test(avatarUri)) result.avatarUri = avatarUri;
  if (age !== undefined) result.age = age;
  if (heightCm !== undefined) result.heightCm = heightCm;
  if (weightKg !== undefined) result.weightKg = weightKg;
  if (targetWeightKg !== undefined) result.targetWeightKg = targetWeightKg;
  if (customGoalAdjustmentKcal !== undefined) result.customGoalAdjustmentKcal = customGoalAdjustmentKcal;
  if (usualStepsPerDay !== undefined) result.usualStepsPerDay = usualStepsPerDay;
  if (walkingMinutesPerDay !== undefined) result.walkingMinutesPerDay = walkingMinutesPerDay;
  if (bodyFatPercent !== undefined) result.bodyFatPercent = bodyFatPercent;
  if (sex) result.sex = sex;
  if (workActivity) result.workActivity = workActivity;
  if (dietPref) result.dietPref = dietPref;
  if (Array.isArray(source.recurringActivities)) result.recurringActivities = recurringActivities;
  return result;
}

export function normalizeNotificationPreferences(value: unknown, defaults: NotificationPreferences): NotificationPreferences {
  const source = isRecord(value) ? value : {};
  return {
    hydration: source.hydration === true,
    meal: source.meal === true,
    activity: source.activity === true,
    sleep: source.sleep === true,
    insight: source.insight === true,
    quietStart: Math.round(finite(source.quietStart, 0, 23) ?? defaults.quietStart),
    quietEnd: Math.round(finite(source.quietEnd, 0, 23) ?? defaults.quietEnd),
  };
}

export function normalizePersistedState(value: unknown, defaults: { profile: Profile; targets: Targets; notificationPreferences: NotificationPreferences }) {
  const source = isRecord(value) ? value : {};
  const habits: Record<string, DayHabits> = {};
  const storedHabits = isRecord(source.habits) ? source.habits : {};
  Object.keys(storedHabits).forEach((key) => { if (dateKey(key)) habits[key] = normalizeDayHabits(storedHabits[key]); });
  return {
    profile: normalizeProfile(source.profile, defaults.profile, defaults.targets),
    entries: Array.isArray(source.entries) ? source.entries.map(normalizeJournalEntry).filter((entry): entry is JournalEntry => entry !== null) : [],
    habits,
    favoriteFoods: Array.isArray(source.favoriteFoods) ? source.favoriteFoods.map(normalizeFood).filter((food): food is Food => food !== null) : [],
    notificationPreferences: normalizeNotificationPreferences(source.notificationPreferences, defaults.notificationPreferences),
  };
}
