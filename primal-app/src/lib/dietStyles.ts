import { DietStyleId, Profile, Targets } from '../types';
import { baseHydrationTarget, outdoorTargetForActivity, sleepGuidelineForAge, sleepTargetForAge } from './healthTargets';
import { calculateMacroTargets, estimateEnergy } from './energy';

export interface DietStyleOption { id: DietStyleId; label: string; description: string; icon: string; androidIcon: string; }
export const DIET_STYLE_OPTIONS: DietStyleOption[] = [
  { id: 'classic', label: 'Classique équilibré', description: 'Alimentation variée et équilibrée avec des repères nutritionnels généraux.', icon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'primal', label: 'Primal', description: 'Aliments peu transformés, protéines et aliments naturellement riches en nutriments.', icon: 'leaf.fill', androidIcon: 'leaf' },
  { id: 'lowCarb', label: 'Low Carb', description: 'Proportion réduite de glucides, avec davantage de place pour les protéines et les lipides.', icon: 'chart.bar.fill', androidIcon: 'bar-chart' },
  { id: 'keto', label: 'Keto', description: 'Alimentation très faible en glucides avec une proportion élevée de lipides.', icon: 'flame.fill', androidIcon: 'flame' },
  { id: 'mediterranean', label: 'Méditerranéen', description: 'Végétaux, poissons, huile d’olive, légumineuses et aliments peu transformés.', icon: 'sun.max.fill', androidIcon: 'sunny' },
  { id: 'custom', label: 'Personnalisé', description: 'Conserve les recommandations générales et laisse les objectifs ajustables dans le Profil.', icon: 'slider.horizontal.3', androidIcon: 'options' },
];
export const DIET_STYLE_DISCLAIMER = 'VISOLIS est une application de suivi et d’information nutritionnelle. Les styles alimentaires sont proposés à titre informatif et ne remplacent pas l’avis d’un professionnel de santé.';
export function getDietStyleOption(style: DietStyleId | undefined): DietStyleOption { return DIET_STYLE_OPTIONS.find((option) => option.id === style) || DIET_STYLE_OPTIONS[0]; }
function valid(value: number | undefined, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
export function calculateDietTargets(profile: Profile, style: DietStyleId): Targets {
  const energy = estimateEnergy({ ...profile, dietStyle: style }, { waterMl: 0, waterEntries: [], steps: 0, outdoorMin: 0, sleepH: 0, activities: [] }, {});
  const kcal = energy.tdee ? energy.targetCalories : profile.targets.kcal; const macros = calculateMacroTargets({ ...profile, dietStyle: style }, kcal);
  return { kcal: macros.kcal, protein: macros.protein, carbs: macros.carbs, fat: macros.fat, fiber: macros.fiber, waterMl: baseHydrationTarget(profile), steps: valid(profile.usualStepsPerDay, 1, 100000) ? profile.usualStepsPerDay as number : profile.activityLevel === 'low' ? 7000 : profile.activityLevel === 'high' ? 12000 : 10000, sleepH: sleepTargetForAge(profile.age), sleepMaxH: sleepGuidelineForAge(profile.age).recMax, outdoorMin: outdoorTargetForActivity(profile.activityLevel) };
}
