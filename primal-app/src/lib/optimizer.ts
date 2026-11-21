import { Food, JournalEntry, NutrientKey, Nutrients, Targets } from '../types';
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

export function optimizeDay(entries: JournalEntry[], targets: Targets): DayOptimization {
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

  const microPriorities: NutritionPriority[] = micronutrientStatuses(entries)
    .filter((status) => status.available && !NUTRIENT_BY_KEY[status.key].isLimit && (status.percent || 0) < 90)
    .map((status) => ({ key: status.key, label: status.label, percent: status.percent || 0, unit: status.unit, remaining: Math.max(0, status.target - (status.amount || 0)), kind: 'micro' as const }));

  const priorities = [...macroPriorities, ...microPriorities]
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 8);
  const deficits = priorities.filter((item) => item.kind === 'micro').slice(0, 5).map(({ key, label, percent }) => ({ key, label, percent }));
  const consumedNames = new Set(entries.map((entry) => entry.foodName.trim().toLocaleLowerCase()));
  const maxKcal = remaining.kcal ?? 0;

  const scored = SUGGESTIBLE_FOOD_BASE
    .filter((food) => !consumedNames.has(food.name.trim().toLocaleLowerCase()))
    .map((food) => {
      const nutrition = scaleNutrients(food.per100, food.portionGrams);
      const kcal = nutrition.kcal;
      if (!known(kcal) || kcal < 0 || kcal > maxKcal) return null;
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
      const covered = impacts.reduce((sum, impact) => sum + Math.min(1, impact.percentTarget / 100), 0);
      const multiGapBonus = impacts.length > 1 ? 0.8 : 0;
      const caloriePenalty = maxKcal > 0 ? (kcal / maxKcal) * 0.35 : 0;
      return { food, nutrition, impacts, score: covered + multiGapBonus - caloriePenalty };
    })
    .filter((item): item is { food: Food; nutrition: Nutrients; impacts: OptimizerImpact[]; score: number } => item !== null)
    .sort((a, b) => b.score - a.score);

  const suggestions: OptimizerSuggestion[] = [];
  const usedCategories = new Set<string>();
  for (const item of scored) {
    if (usedCategories.has(item.food.category) && suggestions.length < 3) continue;
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
