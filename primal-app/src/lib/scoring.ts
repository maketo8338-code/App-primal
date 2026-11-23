import { DayHabits, DayScore, Nutrients, PillarScore, Targets } from '../types';
import { MICRO_KEYS, NUTRIENT_BY_KEY, micronutrientStatuses } from './nutrition';
import { formatSleepDuration } from './sleepSync';

interface PillarCalc {
  key: string;
  label: string;
  icon: string;
  androidIcon: string;
  weight: number;
  score: number;
  available: boolean;
  detail: string;
  action: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function known(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function ratioScore(value: number | undefined, target: number): number | undefined {
  if (!known(value) || !known(target) || target <= 0) return undefined;
  return clamp(Math.round((value / target) * 100));
}

function proximityScore(value: number | undefined, target: number): number | undefined {
  if (!known(value) || !known(target) || target <= 0) return undefined;
  return clamp(Math.round(100 - (Math.abs(value - target) / target) * 100));
}

/**
 * Sleep score from the personal ideal range [min, max] (by default the ideal range for the age):
 * 100 inside the range, then a steady slope: −30 points per hour short (30 min → 85, 1 h → 70,
 * 2 h → 40), −10 points per hour over (never below 50: long sleep is a sign to watch, not a deficit).
 */
function sleepRangeScore(hours: number | undefined, min: number, max: number): number | undefined {
  if (!known(hours) || hours <= 0) return undefined;
  if (hours < min) return Math.max(5, Math.round(100 - 30 * (min - hours)));
  if (hours <= max) return 100;
  return Math.max(50, Math.round(100 - 10 * (hours - max)));
}

function sleepDurationScore(hours: number | undefined): number | undefined {
  if (!known(hours) || hours <= 0) return undefined;
  if (hours < 4) return 20;
  if (hours <= 5) return Math.round(30 + (hours - 4) * 20);
  if (hours <= 6) return Math.round(50 + (hours - 5) * 15);
  if (hours <= 7) return Math.round(65 + (hours - 6) * 15);
  if (hours <= 8) return Math.round(80 + (hours - 7) * 10);
  if (hours <= 9) return Math.round(90 + (hours - 8) * 10);
  return clamp(Math.round(100 - (hours - 9) * 10));
}

function makePillar(calc: PillarCalc): PillarScore {
  const positive = !calc.available ? undefined : calc.score >= 75 ? 'Ce pilier soutient bien ta journée.' : undefined;
  const negative = !calc.available ? undefined : calc.score < 60 ? 'Ce pilier tire actuellement la note vers le bas.' : undefined;
  return { ...calc, positive, negative, action: calc.available && calc.score < 75 ? calc.action : undefined };
}

// Note personnelle 0-100 — indicateur d'habitudes, PAS un diagnostic médical.
export function computeDayScore(totals: Nutrients, habits: DayHabits, targets: Targets): DayScore {
  const kcalScore = proximityScore(totals.kcal, targets.kcal);
  const macroValues = (['protein', 'carbs', 'fat'] as const)
    .map((key) => proximityScore(totals[key], targets[key]))
    .filter((value): value is number => value !== undefined);
  const macroScore = macroValues.length ? Math.round(macroValues.reduce((sum, value) => sum + value, 0) / macroValues.length) : undefined;

  const microStatuses = micronutrientStatuses([{ id: 'score', date: '', meal: 'snack', foodName: '', source: 'core', grams: 100, per100: totals }]);
  const knownMicros = microStatuses.filter((status) => status.available && !NUTRIENT_BY_KEY[status.key].isLimit);
  const microScore = knownMicros.length
    ? Math.round(knownMicros.reduce((sum, status) => sum + clamp(((status.amount || 0) / status.target) * 100), 0) / knownMicros.length)
    : undefined;

  const foodWater = known(totals.water) ? totals.water : 0;
  const hydrationMl = habits.waterMl + foodWater;
  // 100 from 80 % of the target: the target is a guideline, not an exact need.
  const hydrationScore = ratioScore(hydrationMl > 0 ? hydrationMl : undefined, targets.waterMl * 0.8);
  const activityScore = ratioScore(habits.steps > 0 ? habits.steps : undefined, targets.steps);
  const sleepMin = known(targets.sleepH) && targets.sleepH > 0 ? targets.sleepH : undefined;
  const sleepScore = habits.sleepH > 0 ? (sleepMin !== undefined ? sleepRangeScore(habits.sleepH, sleepMin, Math.max(sleepMin, targets.sleepMaxH ?? sleepMin + 1)) : sleepDurationScore(habits.sleepH)) : undefined;
  const outdoorScore = ratioScore(habits.outdoorMin > 0 ? habits.outdoorMin : undefined, targets.outdoorMin);

  const pillars = [
    makePillar({ key: 'nutrition', label: 'Nutrition', icon: 'fork.knife', androidIcon: 'restaurant', weight: 0.15, score: kcalScore ?? 50, available: kcalScore !== undefined, detail: kcalScore === undefined ? 'Donnée non renseignée' : `${Math.round(totals.kcal || 0)} / ${targets.kcal} kcal`, action: 'Ajoute ou ajuste une portion pour te rapprocher de ta cible calorique.' }),
    makePillar({ key: 'macros', label: 'Macronutriments', icon: 'chart.bar.fill', androidIcon: 'bar-chart', weight: 0.15, score: macroScore ?? 50, available: macroScore !== undefined, detail: macroScore === undefined ? 'Données non renseignées' : 'Protéines · glucides · lipides', action: 'Choisis un aliment qui complète le macronutriment le plus éloigné de sa cible.' }),
    makePillar({ key: 'micros', label: 'Micronutriments', icon: 'sparkles', androidIcon: 'sparkles', weight: 0.17, score: microScore ?? 50, available: microScore !== undefined, detail: microScore === undefined ? 'Aucune donnée exploitable' : `${knownMicros.length} nutriments suivis`, action: 'Ajoute un aliment dont les micronutriments sont documentés.' }),
    makePillar({ key: 'hydration', label: 'Hydratation', icon: 'drop.fill', androidIcon: 'water', weight: 0.14, score: hydrationScore ?? 50, available: hydrationScore !== undefined, detail: hydrationScore === undefined ? 'Donnée non renseignée' : `${(habits.waterMl / 1000).toFixed(1)} L bue${foodWater > 0 ? ` · ${(foodWater / 1000).toFixed(1)} L aliments` : ''} / ${(targets.waterMl / 1000).toFixed(1)} L`, action: 'Enregistre un verre d’eau pour faire progresser ce pilier.' }),
    makePillar({ key: 'activity', label: 'Activité', icon: 'figure.walk', androidIcon: 'walk', weight: 0.14, score: activityScore ?? 50, available: activityScore !== undefined, detail: activityScore === undefined ? 'Donnée non renseignée' : `${habits.steps.toLocaleString('fr-FR')} / ${targets.steps.toLocaleString('fr-FR')} pas`, action: 'Ajoute quelques pas et enregistre ton activité du jour.' }),
    makePillar({ key: 'sleep', label: 'Sommeil', icon: 'moon.fill', androidIcon: 'moon', weight: 0.17, score: sleepScore ?? 50, available: sleepScore !== undefined, detail: sleepScore === undefined ? 'Non renseigné' : `${formatSleepDuration(habits.sleepH)} / ${formatSleepDuration(targets.sleepH)}`, action: 'Renseigne ta durée de sommeil pour suivre ce pilier.' }),
    makePillar({ key: 'outdoor', label: 'Extérieur', icon: 'sun.max.fill', androidIcon: 'sunny', weight: 0.08, score: outdoorScore ?? 50, available: outdoorScore !== undefined, detail: outdoorScore === undefined ? 'Donnée non renseignée' : `${habits.outdoorMin} / ${targets.outdoorMin} min dehors`, action: 'Enregistre un moment passé dehors aujourd’hui.' }),
  ];

  const availableWeight = pillars.reduce((sum, pillar) => sum + (pillar.available ? pillar.weight ?? 0 : 0), 0);
  const score = availableWeight > 0
    ? Math.round(pillars.reduce((sum, pillar) => sum + (pillar.available ? pillar.score * (pillar.weight ?? 0) : 0), 0) / availableWeight)
    : 0;
  const label = availableWeight === 0 ? 'Pas encore assez de données' : score >= 90 ? 'Excellent' : score >= 75 ? 'Très bien' : score >= 60 ? 'Correct' : score >= 40 ? 'À améliorer' : 'Faible';
  const deficits = microStatuses
    .filter((status) => status.available && !NUTRIENT_BY_KEY[status.key].isLimit && (status.percent || 0) < 75)
    .sort((a, b) => (a.percent || 0) - (b.percent || 0));

  // Deficits keep the full micronutrient status (screens read more than key/label/percent).
  return { score, label, emoji: '', coverage: Math.round(availableWeight * 100), pillars, deficits: deficits as DayScore['deficits'] };
}
