import { JournalEntry, NutrientKey, Targets } from '../types';
import { normalize, PRIMAL_FOOD_BASE } from './foodSources';
import { completeTotalForEntries, fmtAmount, micronutrientStatuses, NUTRIENT_BY_KEY, pct } from './nutrition';

export type AdviceKind = 'macro' | 'micronutrient' | 'hydration';
export type AdviceStatus = 'insufficient' | 'near';

export interface NutritionAdvice {
  key: NutrientKey;
  label: string;
  kind: AdviceKind;
  status: AdviceStatus;
  percent: number;
  missing: string;
  detail: string;
  suggestions: string[];
}

export interface NutritionAdviceOptions {
  targets: Pick<Targets, 'kcal' | 'protein' | 'carbs' | 'fat' | 'waterMl'>;
  hydrationTotal: number;
  limit?: number;
}

const FOOD_SUGGESTIONS: Partial<Record<NutrientKey, string[]>> = {
  kcal: ['Riz blanc', 'Avocat', 'Amandes'],
  protein: ['Poulet', 'Œufs', 'Lentilles'],
  carbs: ['Riz blanc', 'Pâtes', 'Flocons d’avoine'],
  fat: ['Avocat', 'Amandes', 'Huile d’olive'],
  vitA: ['Carotte', 'Patate douce', 'Épinards'],
  vitB1: ['Porc', 'Avoine', 'Lentilles'],
  vitB2: ['Yaourt', 'Œufs', 'Amandes'],
  vitB3: ['Poulet', 'Thon', 'Arachides'],
  vitB5: ['Avocat', 'Champignons', 'Poulet'],
  vitB6: ['Banane', 'Poulet', 'Pois chiches'],
  vitB7: ['Œufs', 'Amandes', 'Noix'],
  vitB9: ['Lentilles', 'Épinards', 'Brocoli'],
  vitB12: ['Saumon', 'Œufs', 'Yaourt'],
  vitC: ['Kiwi', 'Orange', 'Poivron'],
  vitD: ['Saumon', 'Sardines', 'Œufs'],
  vitE: ['Amandes', 'Graines de tournesol', 'Avocat'],
  vitK: ['Épinards', 'Brocoli', 'Chou kale'],
  calcium: ['Yaourt', 'Sardines', 'Amandes'],
  magnesium: ['Amandes', 'Chocolat noir', 'Lentilles'],
  potassium: ['Banane', 'Pomme de terre', 'Avocat'],
  iron: ['Lentilles', 'Bœuf', 'Épinards'],
  zinc: ['Bœuf', 'Graines de courge', 'Pois chiches'],
  copper: ['Noix de cajou', 'Lentilles', 'Champignons'],
  manganese: ['Flocons d’avoine', 'Noix', 'Riz complet'],
  selenium: ['Thon', 'Œufs', 'Champignons'],
  iodine: ['Cabillaud', 'Yaourt', 'Œufs'],
  phosphorus: ['Yaourt', 'Poulet', 'Lentilles'],
  fiber: ['Lentilles', 'Flocons d’avoine', 'Brocoli'],
  omega3: ['Saumon', 'Sardines', 'Noix'],
};

function suggestionsFromBase(key: NutrientKey): string[] {
  return (FOOD_SUGGESTIONS[key] || []).reduce<string[]>((found, query) => {
    const normalizedQuery = normalize(query);
    const food = PRIMAL_FOOD_BASE.find((candidate) => {
      const value = candidate.per100[key];
      return normalize(candidate.name).includes(normalizedQuery) && typeof value === 'number' && Number.isFinite(value) && value > 0;
    });
    if (food && !found.includes(food.name)) found.push(food.name);
    return found;
  }, []).slice(0, 3);
}

function makeAdvice(key: NutrientKey, label: string, amount: number | undefined, target: number, kind: AdviceKind): NutritionAdvice | null {
  if (amount === undefined || !Number.isFinite(amount) || !Number.isFinite(target) || target <= 0) return null;
  const percent = pct(amount, target);
  if (percent >= 85) return null;
  const status: AdviceStatus = percent < 70 ? 'insufficient' : 'near';
  const missingValue = Math.max(0, target - amount);
  const missing = kind === 'hydration' ? `${Math.round(missingValue)} ml` : fmtAmount(key, missingValue);
  const detail = kind === 'hydration'
    ? `Il te reste environ ${missing} à boire aujourd’hui.`
    : status === 'insufficient'
      ? `Ton apport est encore faible aujourd’hui : il te manque environ ${missing}.`
      : `Tu es presque à l’objectif, avec encore environ ${missing} à compléter.`;
  return { key, label, kind, status, percent, missing, detail, suggestions: kind === 'hydration' ? [] : suggestionsFromBase(key) };
}

export function nutritionAdvice(entries: JournalEntry[], options: NutritionAdviceOptions): NutritionAdvice[] {
  const candidates: NutritionAdvice[] = [];
  const macroSpecs: Array<{ key: 'kcal' | 'protein' | 'carbs' | 'fat'; label: string }> = [
    { key: 'kcal', label: 'Calories' },
    { key: 'protein', label: 'Protéines' },
    { key: 'carbs', label: 'Glucides' },
    { key: 'fat', label: 'Lipides' },
  ];
  macroSpecs.forEach(({ key, label }) => {
    const advice = makeAdvice(key, label, completeTotalForEntries(entries, key), options.targets[key], 'macro');
    if (advice) candidates.push(advice);
  });

  micronutrientStatuses(entries)
    .filter((status) => status.available && status.complete && status.percent !== undefined && status.percent < 85 && !NUTRIENT_BY_KEY[status.key].isLimit)
    .forEach((status) => {
      const advice = makeAdvice(status.key, status.label, status.amount, status.target, 'micronutrient');
      if (advice) candidates.push(advice);
    });

  const hydrationAdvice = makeAdvice('water', 'Hydratation', options.hydrationTotal, options.targets.waterMl, 'hydration');
  if (hydrationAdvice) candidates.push(hydrationAdvice);
  return candidates.sort((a, b) => a.percent - b.percent || (a.kind === 'hydration' ? 1 : 0) - (b.kind === 'hydration' ? 1 : 0)).slice(0, options.limit ?? 4);
}
