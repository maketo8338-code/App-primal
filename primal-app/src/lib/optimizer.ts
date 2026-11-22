import { Food, JournalEntry, NutrientKey, Nutrients, Profile, Targets } from '../types';
import { isEverydayFood } from './everydayFoods';
import { SUGGESTIBLE_FOOD_BASE } from './foodSources';
import { completeTotalForEntries, micronutrientStatuses, NUTRIENT_BY_KEY, scaleNutrients } from './nutrition';

export interface OptimizerImpact {
  key: NutrientKey;
  label: string;
  amount: number;
  unit: string;
  percentTarget: number;
}

export interface OptimizerSuggestion {
  food: Food;
  portionGrams: number;
  nutrition: Nutrients;
  reasons: string[];
  impacts: OptimizerImpact[];
}

export interface NutritionPriority {
  key: NutrientKey;
  label: string;
  percent: number;
  unit: string;
  remaining: number;
  kind: 'macro' | 'micro';
}

export interface DayOptimization {
  remaining: { kcal?: number; protein?: number; carbs?: number; fat?: number };
  priorities: NutritionPriority[];
  deficits: Array<{ key: NutrientKey; label: string; percent: number }>;
  suggestions: OptimizerSuggestion[];
}

type MacroKey = 'protein' | 'carbs' | 'fat';
const MACROS: MacroKey[] = ['protein', 'carbs', 'fat'];

function known(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Iron absorbed from meat and fish (part heme) is far higher than from plants (non-heme only). */
const HEME_CATEGORIES = new Set(['MEAT', 'FISH_SEAFOOD']);
/** Rough share of iron « counted » for ranking: animal flesh 1, other foods 0.5, +0.25 with ≥ 25 mg vitamin C (helps absorb plant iron). An approximation: Ciqual does not split heme / non-heme iron. */
function ironFactor(food: Food, nutrition: Nutrients): number {
  if (HEME_CATEGORIES.has(food.category)) return 1;
  return (nutrition.vitC ?? 0) >= 25 ? 0.75 : 0.5;
}

/** What one meal can reasonably bring, used to judge macros. */
const MEAL_CHUNK: Partial<Record<NutrientKey, number>> = { protein: 30, carbs: 70, fat: 20 };

/** Foods that clash with the chosen eating style are not suggested. */
function fitsDietStyle(food: Food, nutrition: Nutrients, style?: Profile['dietStyle']): boolean {
  const carbs = nutrition.carbs ?? 0;
  if (style === 'keto') return carbs <= 8;
  if (style === 'lowCarb') return carbs <= 20;
  if (style === 'primal') return food.category !== 'CEREALS' && food.category !== 'LEGUMES';
  return true;
}

export function optimizeDay(entries: JournalEntry[], targets: Targets, profile?: Pick<Profile, 'age' | 'sex' | 'dietStyle'>): DayOptimization {
  const remaining = {
    kcal: (() => { const value = completeTotalForEntries(entries, 'kcal'); return value === undefined ? undefined : Math.max(0, targets.kcal - value); })(),
    protein: (() => { const value = completeTotalForEntries(entries, 'protein'); return value === undefined ? undefined : Math.max(0, targets.protein - value); })(),
    carbs: (() => { const value = completeTotalForEntries(entries, 'carbs'); return value === undefined ? undefined : Math.max(0, targets.carbs - value); })(),
    fat: (() => { const value = completeTotalForEntries(entries, 'fat'); return value === undefined ? undefined : Math.max(0, targets.fat - value); })(),
  };

  const macroPriorities: NutritionPriority[] = MACROS
    .map((key): NutritionPriority | null => {
      const target = targets[key];
      const consumed = completeTotalForEntries(entries, key);
      if (!known(consumed)) return null;
      return { key, label: NUTRIENT_BY_KEY[key].label, percent: target > 0 ? Math.round((consumed / target) * 100) : 0, unit: NUTRIENT_BY_KEY[key].unit, remaining: Math.max(0, target - consumed), kind: 'macro' as const };
    })
    .filter((item): item is NutritionPriority => item !== null && item.percent < 90 && item.remaining > 0);

  const microPriorities: NutritionPriority[] = micronutrientStatuses(entries, profile)
    .filter((status) => status.available && !NUTRIENT_BY_KEY[status.key].isLimit && (status.percent || 0) < 90)
    .map((status) => ({ key: status.key, label: status.label, percent: status.percent || 0, unit: status.unit, remaining: Math.max(0, status.target - (status.amount || 0)), kind: 'micro' as const }));

  // Macro gaps always count; micronutrients fill the remaining slots (8 in total).
  const priorities = [...macroPriorities, ...microPriorities.sort((a, b) => a.percent - b.percent).slice(0, Math.max(0, 8 - macroPriorities.length))]
    .sort((a, b) => a.percent - b.percent);
  const deficits = priorities.filter((item) => item.kind === 'micro').slice(0, 5).map(({ key, label, percent }) => ({ key, label, percent }));
  const consumedNames = new Set(entries.map((entry) => entry.foodName.trim().toLocaleLowerCase()));
  const maxKcal = remaining.kcal ?? 0;

  const scored = SUGGESTIBLE_FOOD_BASE
    .filter((food) => !consumedNames.has(food.name.trim().toLocaleLowerCase()) && isEverydayFood(food))
    .map((food) => {
      const nutrition = scaleNutrients(food.per100, food.portionGrams);
      const kcal = nutrition.kcal;
      if (!known(kcal) || kcal < 0 || kcal > maxKcal) return null;
      if (!fitsDietStyle(food, nutrition, profile?.dietStyle)) return null;
      const impacts = priorities
        .map((priority) => {
          const amount = nutrition[priority.key];
          if (!known(amount) || amount <= 0) return null;
          const percentTarget = priority.remaining > 0 ? (amount / priority.remaining) * 100 : 0;
          return { key: priority.key, label: priority.label, amount, unit: priority.unit, percentTarget };
        })
        .filter((item): item is OptimizerImpact => item !== null)
        .sort((a, b) => b.percentTarget - a.percentTarget);
      if (!impacts.length) return null;
      // Macros are judged against what one meal can bring (not the whole day's gap),
      // and weigh more than any micronutrient; micronutrients have diminishing returns,
      // so a leafy vegetable that ticks five vitamins no longer beats a protein dish.
      const MACRO_WEIGHT: Partial<Record<NutrientKey, number>> = { protein: (remaining.protein ?? 0) >= 20 ? 3 : 2, carbs: 1.5, fat: 1.2 };
      let macroScore = 0; let microScore = 0;
      for (const impact of impacts) {
        const chunk = MEAL_CHUNK[impact.key];
        if (chunk !== undefined) {
          const needed = Math.min(chunk, priorities.find((p) => p.key === impact.key)?.remaining ?? chunk);
          macroScore += Math.min(1, impact.amount / Math.max(1, needed)) * (MACRO_WEIGHT[impact.key] ?? 1);
        } else {
          microScore += Math.min(1, impact.percentTarget / 100) * (impact.key === 'iron' ? ironFactor(food, nutrition) : 1);
        }
      }
      const covered = macroScore + Math.min(2.2, microScore) * 0.75;
      const multiGapBonus = impacts.length > 1 ? 0.5 : 0;
      const caloriePenalty = maxKcal > 0 ? (kcal / maxKcal) * 0.25 : 0;
      return { food, nutrition, impacts, score: covered + multiGapBonus - caloriePenalty };
    })
    .filter((item): item is { food: Food; nutrition: Nutrients; impacts: OptimizerImpact[]; score: number } => item !== null)
    .sort((a, b) => b.score - a.score);

  const suggestions: OptimizerSuggestion[] = [];
  const usedCategories = new Set<string>();
  for (const item of scored) {
    if (usedCategories.has(item.food.category) && suggestions.length < 3) continue;
    // Show a macro first when the food brings a real share of a meal (e.g. ≥ 15 g protein).
    const bigMacro = (impact: OptimizerImpact) => MEAL_CHUNK[impact.key] !== undefined && impact.amount >= (MEAL_CHUNK[impact.key] ?? 0) * 0.5;
    item.impacts = [...item.impacts.filter(bigMacro), ...item.impacts.filter((impact) => !bigMacro(impact))];
    suggestions.push({
      food: item.food,
      portionGrams: item.food.portionGrams,
      nutrition: item.nutrition,
      impacts: item.impacts.slice(0, 3),
      reasons: item.impacts.slice(0, 3).map((impact) => impact.label),
    });
    usedCategories.add(item.food.category);
    if (suggestions.length === 5) break;
  }

  return { remaining, priorities, deficits, suggestions };
}
