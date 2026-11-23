export type NutrientKey =
  | 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'satFat' | 'omega3' | 'water'
  | 'vitA' | 'vitB1' | 'vitB2' | 'vitB3' | 'vitB5' | 'vitB6' | 'vitB7' | 'vitB9' | 'vitB12'
  | 'vitC' | 'vitD' | 'vitE' | 'vitK'
  | 'calcium' | 'magnesium' | 'potassium' | 'sodium' | 'iron' | 'zinc' | 'copper'
  | 'manganese' | 'selenium' | 'iodine' | 'phosphorus';

export type Nutrients = Partial<Record<NutrientKey, number>>;
export type FoodSource = 'core' | 'usda' | 'off' | 'ciqual';
export type RawNutrientValue = number | string | null;
export type DietStyleId = 'classic' | 'primal' | 'lowCarb' | 'keto' | 'custom' | 'mediterranean';

export interface Food { id: string; source: FoodSource; ciqualCode?: number; ciqualRaw?: Record<string, RawNutrientValue>; name: string; brand?: string; category: string; portionLabel: string; portionGrams: number; per100: Nutrients; /** Nutrients estimated from similar foods (shown with ≈). */ estimated?: NutrientKey[]; }
export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface JournalEntry { id: string; date: string; meal: MealId; foodName: string; brand?: string; source: FoodSource; foodId?: string; grams: number; per100: Nutrients; }

export type ActivityIntensity = 'douce' | 'modérée' | 'intense';
export type ActivitySource = 'manual' | 'device';
export interface ManualActivity { id: string; name: string; minutes: number; intensity?: ActivityIntensity; kcal?: number; distanceKm?: number; source?: ActivitySource; }
export interface RecurringActivity { id: string; name: string; sessionsPerWeek: number; minutes: number; intensity: ActivityIntensity; }
export type WorkActivityLevel = 'sedentary' | 'standing' | 'active';
export type BiologicalSex = 'female' | 'male' | 'unspecified';
export type GoalId = 'maintain' | 'lose' | 'gain' | 'personalized' | 'health';

export interface WaterEntry { id: string; ml: number; }
export type SleepSource = 'manual' | 'device';
export interface DayHabits { waterMl: number; waterEntries: WaterEntry[]; steps: number; distanceKm?: number; outdoorMin: number; sleepH: number; sleepBedtime?: string; sleepWakeTime?: string; sleepSource?: SleepSource; weight?: number; activities: ManualActivity[]; }

export interface Targets { kcal: number; protein: number; carbs: number; fat: number; fiber: number; waterMl: number; steps: number; /** Ideal sleep: from sleepH to sleepMaxH (score 100 in between). */ sleepH: number; sleepMaxH?: number; outdoorMin: number; }
export type TargetOverrides = Partial<Targets>;
export type NotificationKind = 'hydration' | 'meal' | 'activity' | 'sleep' | 'insight';
export interface NotificationPreferences { hydration: boolean; meal: boolean; activity: boolean; sleep: boolean; insight: boolean; quietStart: number; quietEnd: number; }

export interface Profile {
  firstName: string;
  avatarUri?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  sex?: BiologicalSex;
  goal: GoalId;
  targetWeightKg?: number;
  customGoalAdjustmentKcal?: number;
  activityLevel: 'low' | 'moderate' | 'high';
  usualStepsPerDay?: number;
  workActivity?: WorkActivityLevel;
  walkingMinutesPerDay?: number;
  recurringActivities?: RecurringActivity[];
  bodyFatPercent?: number;
  dietPref?: string;
  dietStyle?: DietStyleId;
  targets: Targets;
  targetOverrides?: TargetOverrides;
  onboarded: boolean;
}

export interface PillarScore { key: string; label: string; icon: string; androidIcon: string; score: number; detail: string; available?: boolean; weight?: number; positive?: string; negative?: string; action?: string; }
export interface DayScore { score: number; label: string; emoji: string; coverage: number; deficits?: Array<{ key: NutrientKey; label: string; percent: number }>; pillars: PillarScore[]; }
