import { DayHabits, DietStyleId, Nutrients, Profile, Targets, WorkActivityLevel } from '../types';
import { estimateActivityCalories } from './activitySync';

export type Confidence = 'faible' | 'moyenne' | 'élevée';
export interface EnergyBreakdown { bmr?: number; neat?: number; neatSteps?: number; neatDaily?: number; eat?: number; tef?: number; tdee?: number; restTdee?: number; activeTdee?: number; averageTdee?: number; targetCalories?: number; goalAdjustment?: number; confidence: Confidence; missing: string[]; source: string; }
export interface EnergyEstimate extends EnergyBreakdown { bmr: number; neat: number; neatAdjustment: number; exercise: number; tef?: number; tdee: number; targetCalories: number; goalAdjustment: number; activityAdjusted: boolean; basisLabel: string; }
export interface MacroDebug { targetCalories: number; proteinTarget: number; proteinKcal: number; carbTarget: number; carbKcal: number; fatTarget: number; fatKcal: number; totalMacroKcal: number; differenceKcal: number; dietStyle: DietStyleId; strategy: string; }
export interface MacroTargets { kcal: number; protein: number; fat: number; carbs: number; fiber: number; proteinDebug?: ProteinDebug; macroDebug?: MacroDebug; }
export interface DailyNutritionTargets { energy: EnergyEstimate; macros: MacroTargets; }
export interface HistoricalEnergyInput { date: string; consumedKcal?: number; weightKg?: number; }

function valid(value: number | undefined, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function hasSex(sex: Profile['sex']): sex is 'female' | 'male' { return sex === 'female' || sex === 'male'; }
function validBody(profile: Pick<Profile, 'age' | 'heightCm' | 'weightKg'>): boolean { return valid(profile.age, 13, 120) && valid(profile.heightCm, 100, 230) && valid(profile.weightKg, 25, 300); }
function round50(value: number): number { return Math.round(value / 50) * 50; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }

export function estimateBmr(profile: Pick<Profile, 'age' | 'heightCm' | 'weightKg' | 'sex' | 'bodyFatPercent'>): number | undefined {
  if (!validBody(profile)) return undefined;
  if (hasSex(profile.sex)) return Math.round(10 * (profile.weightKg as number) + 6.25 * (profile.heightCm as number) - 5 * (profile.age as number) + (profile.sex === 'male' ? 5 : -161));
  if (valid(profile.bodyFatPercent, 2, 70)) return Math.round(370 + 21.6 * ((profile.weightKg as number) * (1 - (profile.bodyFatPercent as number) / 100)));
  return undefined;
}

function activityFactor(level: Profile['activityLevel']): number { return level === 'low' ? 0.22 : level === 'high' ? 0.42 : 0.32; }
function workNeat(level: WorkActivityLevel | undefined, bmr: number): number {
  if (level === 'standing') return Math.round(bmr * 0.25);
  if (level === 'active') return Math.round(bmr * 0.38);
  if (level === 'sedentary') return Math.round(bmr * 0.16);
  return Math.round(bmr * activityFactor('moderate'));
}
function stepKcal(profile: Pick<Profile, 'heightCm' | 'weightKg'>): number | undefined {
  if (!valid(profile.heightCm, 100, 230) || !valid(profile.weightKg, 25, 300)) return undefined;
  const strideKm = ((profile.heightCm as number) * 0.414) / 100000;
  return Math.max(0.001, (profile.weightKg as number) * strideKm * 0.5);
}
function stepsForActivity(activity: { name: string; minutes: number }): number {
  const stepsPerMinute: Record<string, number> = { marche: 105, course: 155, football: 125, basketball: 125, tennis: 115, randonnée: 95, danse: 100 };
  const match = Object.keys(stepsPerMinute).find((key) => activity.name.toLowerCase().includes(key));
  return match ? Math.round(activity.minutes * stepsPerMinute[match]) : 0;
}
function overlapSteps(habits: DayHabits): number { return habits.activities.reduce((sum, activity) => sum + stepsForActivity(activity), 0); }
function estimateNeat(profile: Profile, habits: DayHabits, bmr: number): { total: number; steps: number; daily: number; adjustment: number; actual: boolean } {
  const perStep = stepKcal(profile);
  const actualSteps = valid(habits.steps, 1, 100000) ? Math.max(0, habits.steps - overlapSteps(habits)) : undefined;
  const baselineSteps = valid(profile.usualStepsPerDay, 1, 100000) ? profile.usualStepsPerDay : undefined;
  const effectiveSteps = actualSteps !== undefined ? actualSteps : baselineSteps;
  const steps = perStep !== undefined && effectiveSteps !== undefined ? Math.round(effectiveSteps * perStep) : 0;
  const daily = workNeat(profile.workActivity, bmr) + (!effectiveSteps && valid(profile.walkingMinutesPerDay, 0, 1440) ? Math.round((profile.weightKg as number) * 0.05 * (profile.walkingMinutesPerDay as number)) : 0);
  return { total: Math.max(0, steps + daily), steps, daily, adjustment: actualSteps !== undefined && baselineSteps !== undefined ? steps - Math.round(baselineSteps * (perStep || 0)) : 0, actual: actualSteps !== undefined };
}
function activityCalories(profile: Profile, activities: DayHabits['activities']): number { return Math.round(activities.reduce((sum, activity) => sum + (typeof activity.kcal === 'number' && Number.isFinite(activity.kcal) ? activity.kcal : (estimateActivityCalories(activity.name, activity.minutes, profile.weightKg, activity.intensity) || 0)), 0)); }
export function estimateTef(consumed: Nutrients): number | undefined {
  const protein = consumed.protein; const carbs = consumed.carbs; const fat = consumed.fat;
  if (![protein, carbs, fat].some((value) => typeof value === 'number' && Number.isFinite(value))) return undefined;
  return Math.round((typeof protein === 'number' ? protein * 4 * 0.2 : 0) + (typeof carbs === 'number' ? carbs * 4 * 0.075 : 0) + (typeof fat === 'number' ? fat * 9 * 0.025 : 0));
}
function goalAdjustment(profile: Pick<Profile, 'goal' | 'customGoalAdjustmentKcal' | 'weightKg' | 'targetWeightKg'>, tdee: number): number {
  if (profile.goal === 'personalized' && valid(profile.customGoalAdjustmentKcal, -1000, 1000)) return Math.round((profile.customGoalAdjustmentKcal as number) / 25) * 25;
  if (profile.goal === 'lose') return -clamp(Math.round(tdee * 0.12 / 25) * 25, 200, 500);
  if (profile.goal === 'gain') return clamp(Math.round(tdee * 0.08 / 25) * 25, 150, 350);
  return 0;
}
/** Share of logged exercise calories added back: activity estimates (METs, watches) tend to overestimate. */
const EXERCISE_SHARE = 0.75;
/** Safety floor for the daily target: commonly cited minimums, 1 500 kcal for men, 1 200 kcal otherwise. */
function minimumKcal(profile: Pick<Profile, 'sex'>): number { return profile.sex === 'male' ? 1500 : 1200; }

function historyTdee(history: HistoricalEnergyInput[] | undefined): { value?: number; confidence: Confidence } {
  const usable = (history || []).filter((item) => valid(item.consumedKcal, 800, 8000) && valid(item.weightKg, 25, 300));
  if (usable.length < 7) return { confidence: 'faible' };
  const recent = usable.slice(-28); const weights = recent.map((item) => item.weightKg as number); const calories = recent.map((item) => item.consumedKcal as number);
  const first = weights.slice(0, Math.min(7, weights.length)); const last = weights.slice(-Math.min(7, weights.length));
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const deltaKg = average(last) - average(first); const days = Math.max(7, recent.length); const adjustment = deltaKg * 7700 / days;
  return { value: clamp(Math.round((average(calories) - adjustment) / 25) * 25, 1200, 6000), confidence: usable.length >= 21 ? 'élevée' : 'moyenne' };
}
export function confidenceForEnergy(profile: Profile, habits: DayHabits, history?: HistoricalEnergyInput[]): Confidence {
  const data = historyTdee(history); if (data.value !== undefined) return data.confidence;
  const complete = validBody(profile) && hasSex(profile.sex); const activity = valid(profile.usualStepsPerDay, 1, 100000) || profile.workActivity !== undefined || habits.steps > 0 || habits.activities.length > 0;
  if (complete && activity && history && history.length >= 14) return 'élevée';
  if (complete && activity) return 'moyenne';
  return 'faible';
}
export function estimateEnergy(profile: Profile, habits: DayHabits, consumed: Nutrients, history?: HistoricalEnergyInput[]): EnergyEstimate {
  const bmr = estimateBmr(profile); const missing: string[] = [];
  if (bmr === undefined) { if (!valid(profile.age, 13, 120)) missing.push('âge'); if (!valid(profile.heightCm, 100, 230)) missing.push('taille'); if (!valid(profile.weightKg, 25, 300)) missing.push('poids'); if (!hasSex(profile.sex) && !valid(profile.bodyFatPercent, 2, 70)) missing.push('sexe biologique ou masse grasse'); }
  const safeBmr = bmr || 0; const neatParts = safeBmr ? estimateNeat(profile, habits, safeBmr) : { total: 0, steps: 0, daily: 0, adjustment: 0, actual: false }; const eat = bmr ? activityCalories(profile, habits.activities) : 0; const tef = estimateTef(consumed);
  const restTdee = bmr ? Math.round(bmr + neatParts.total + (tef || 0)) : undefined; const activeTdee = bmr ? Math.round((restTdee || 0) + eat * EXERCISE_SHARE) : undefined; const historyResult = historyTdee(history); const actual = neatParts.actual || habits.activities.length > 0;
  // With ≥ 7 days of real calories + weight, the real average expenditure wins (formulas can be 10–15 % off);
  // that average already includes usual activity, so only half of today's logged exercise is added.
  const tdee = historyResult.value !== undefined ? Math.round(historyResult.value + eat * 0.5) : actual ? (activeTdee || restTdee || 0) : (restTdee || 0); const adjustment = goalAdjustment(profile, tdee); const target = tdee ? clamp(round50(tdee + adjustment), minimumKcal(profile), 6000) : profile.targets.kcal;
  const confidence = historyResult.value !== undefined ? historyResult.confidence : confidenceForEnergy(profile, habits, history); const source = historyResult.value !== undefined ? 'moyenne réelle calories/poids sur plusieurs jours' : actual ? 'BMR + activité du jour + exercice enregistré + TEF estimé' : 'BMR + activité habituelle ; renseigne tes pas et tes activités le jour venu pour affiner';
  return { bmr: safeBmr, neat: neatParts.total, neatSteps: neatParts.steps, neatDaily: neatParts.daily, neatAdjustment: neatParts.adjustment, exercise: eat, eat, tef, tdee, restTdee, activeTdee, averageTdee: historyResult.value, targetCalories: target, goalAdjustment: adjustment, activityAdjusted: actual, basisLabel: bmr ? `Confiance ${confidence} · ${source}.` : `Calcul incomplet : renseigne ${missing.join(', ')}.`, confidence, missing, source };
}
export function estimateBaselineTdee(profile: Profile): number { const estimate = estimateEnergy(profile, { waterMl: 0, waterEntries: [], steps: 0, outdoorMin: 0, sleepH: 0, activities: [] }, {}); return estimate.tdee || profile.targets.kcal; }
export function calculateGoalCalories(profile: Profile, tdee: number): number { return clamp(round50(tdee + goalAdjustment(profile, tdee)), minimumKcal(profile), 6000); }

function isResistanceActivity(name: string): boolean { return /musculation|muscle|calisthenics|force|crossfit|haltère|poids|bodybuild|renforcement/i.test(name); }
function hasResistanceTraining(activities: DayHabits['activities']): boolean { return activities.some((activity) => isResistanceActivity(activity.name)); }
function hasRecurringResistance(profile: Profile): boolean { return (profile.recurringActivities || []).some((activity) => isResistanceActivity(activity.name) && activity.sessionsPerWeek > 0); }
function resistanceFrequency(profile: Profile): number { return (profile.recurringActivities || []).filter((activity) => isResistanceActivity(activity.name)).reduce((sum, activity) => sum + Math.max(0, activity.sessionsPerWeek || 0), 0); }
function hasMeaningfulActivity(profile: Profile, activities: DayHabits['activities'], steps = 0): boolean { return activities.length > 0 || steps >= 7500 || profile.activityLevel === 'high' || profile.workActivity === 'active'; }

export type SportType = 'SEDENTARY' | 'ACTIVE' | 'ENDURANCE' | 'TEAM_SPORT' | 'RESISTANCE' | 'MIXED';
function classifySport(activities: DayHabits['activities']): SportType {
  if (activities.length === 0) return 'SEDENTARY';
  const resistance = hasResistanceTraining(activities);
  const teamSport = activities.some((activity) => /football|basket|handball|volley|rugby|hockey|water-polo/i.test(activity.name));
  const endurance = activities.some((activity) => /vélo|velo|natation|course|running|marche|randonnée|triathlon|cardio/i.test(activity.name));
  if (resistance && (teamSport || endurance)) return 'MIXED';
  if (resistance) return 'RESISTANCE';
  if (teamSport) return 'TEAM_SPORT';
  if (endurance) return 'ENDURANCE';
  return 'ACTIVE';
}

export interface ProteinAgeCoefficient { minAge: number; maxAge: number; coefficientGPerKg: number; label: string; }
export const PROTEIN_COEFFICIENT_BY_AGE: ProteinAgeCoefficient[] = [
  { minAge: 0, maxAge: 2, coefficientGPerKg: 1.2, label: '0–2 ans' },
  { minAge: 3, maxAge: 5, coefficientGPerKg: 1.1, label: '3–5 ans' },
  { minAge: 6, maxAge: 12, coefficientGPerKg: 1.2, label: '6–12 ans' },
  { minAge: 13, maxAge: 14, coefficientGPerKg: 1.6, label: '13–14 ans' },
  { minAge: 15, maxAge: 40, coefficientGPerKg: 2.0, label: '15–40 ans' },
  { minAge: 41, maxAge: 50, coefficientGPerKg: 1.8, label: '41–50 ans' },
  { minAge: 51, maxAge: 60, coefficientGPerKg: 1.7, label: '51–60 ans' },
  { minAge: 61, maxAge: 70, coefficientGPerKg: 1.6, label: '61–70 ans' },
  { minAge: 71, maxAge: 80, coefficientGPerKg: 1.6, label: '71–80 ans' },
  { minAge: 81, maxAge: Number.POSITIVE_INFINITY, coefficientGPerKg: 1.5, label: '81 ans et plus' },
];
export interface ProteinCalculationContext { dailyActivity?: boolean; dailyActivities?: DayHabits['activities']; resistanceTraining?: boolean; trainingFrequency?: number; trainingVolume?: 'low' | 'moderate' | 'high'; trainingLevel?: 'beginner' | 'intermediate' | 'advanced'; dailySteps?: number; sportType?: SportType; energyBalanceKcal?: number; energyBalance?: 'deficit' | 'maintenance' | 'surplus'; diet?: DietStyleId; }
export interface ProteinDebug {
  age: number | undefined; weightKg: number; sex: Profile['sex']; bodyFatPercent: number | undefined; leanMassKg: number | undefined; ageCoefficientGPerKg: number; sexCoefficient: number; finalCoefficientGPerKg: number; proteinTargetGPerKg: number; proteinTarget: number; proteinBasis: 'body_weight'; explanation: string;
}
export interface ProteinTargetResult { targetGrams: number; debug: ProteinDebug; }

function ageCoefficientFor(age: number | undefined): ProteinAgeCoefficient { return PROTEIN_COEFFICIENT_BY_AGE.find((coefficient) => age !== undefined && age >= coefficient.minAge && age <= coefficient.maxAge) || PROTEIN_COEFFICIENT_BY_AGE[4]; }
function sexCoefficientFor(age: number | undefined, sex: Profile['sex']): number { return age !== undefined && age >= 13 && sex === 'female' ? 0.9 : 1; }

export function calculateProteinTarget(profile: Profile, _context: ProteinCalculationContext = {}): ProteinTargetResult {
  const age = profile.age;
  const weightKg = valid(profile.weightKg, 25, 300) ? profile.weightKg as number : 0;
  const bodyFatPercent = valid(profile.bodyFatPercent, 2, 70) ? profile.bodyFatPercent as number : undefined;
  const leanMassKg = bodyFatPercent !== undefined && weightKg ? Math.round(weightKg * (1 - bodyFatPercent / 100) * 10) / 10 : undefined;
  const ageCoefficient = ageCoefficientFor(age);
  const sexCoefficient = sexCoefficientFor(age, profile.sex);
  const proteinTargetGPerKg = Math.round(ageCoefficient.coefficientGPerKg * sexCoefficient * 100) / 100;
  const proteinTarget = Math.max(0, Math.round(weightKg * proteinTargetGPerKg));
  const debug: ProteinDebug = {
    age,
    weightKg,
    sex: profile.sex,
    bodyFatPercent,
    leanMassKg,
    ageCoefficientGPerKg: ageCoefficient.coefficientGPerKg,
    sexCoefficient,
    finalCoefficientGPerKg: proteinTargetGPerKg,
    proteinTargetGPerKg,
    proteinTarget,
    proteinBasis: 'body_weight',
    explanation: `${ageCoefficient.label} : ${ageCoefficient.coefficientGPerKg.toFixed(1)} g/kg × coefficient sexe ${sexCoefficient.toFixed(2)} × ${weightKg} kg. Seuls l’âge, le sexe et le poids corporel déterminent la cible protéique.`,
  };
  return { targetGrams: proteinTarget, debug };
}

interface MacroPlan { strategy: string; referenceCarbsG: number; referenceFatG: number; minimumCarbsPerKg?: number; minimumCarbsG?: number; carbCapPerKg?: number; }
function macroPlan(style: Profile['dietStyle']): MacroPlan {
  if (style === 'primal') return { strategy: 'PRIMAL : lipides prioritaires, glucides modérés', referenceCarbsG: 173, referenceFatG: 125, minimumCarbsPerKg: 0.8 };
  if (style === 'lowCarb') return { strategy: 'LOW CARB : glucides réduits, lipides renforcés', referenceCarbsG: 117, referenceFatG: 150, minimumCarbsPerKg: 0.5 };
  if (style === 'keto') return { strategy: 'KETO : glucides extrêmement faibles, lipides prioritaires', referenceCarbsG: 20, referenceFatG: 193, minimumCarbsG: 20, carbCapPerKg: 0.5 };
  if (style === 'mediterranean') return { strategy: 'MÉDITERRANÉEN : glucides proches du classique, lipides de qualité', referenceCarbsG: 256, referenceFatG: 88, minimumCarbsPerKg: 1.2 };
  if (style === 'custom') return { strategy: 'PERSONNALISÉ : stratégie classique par défaut', referenceCarbsG: 256, referenceFatG: 88, minimumCarbsPerKg: 1.2 };
  return { strategy: 'CLASSIQUE : répartition équilibrée', referenceCarbsG: 256, referenceFatG: 88, minimumCarbsPerKg: 1.2 };
}
function minimumFat(profile: Profile, weight: number): number { const age = profile.age || 30; const sexFloor = profile.sex === 'female' ? 0.8 : profile.sex === 'male' ? 0.7 : 0.75; const ageFloor = age < 18 ? 0.85 : age >= 65 ? 0.8 : sexFloor; return weight ? Math.max(20, Math.round(weight * Math.max(ageFloor, sexFloor))) : 20; }
function minimumCarbs(weight: number, plan: MacroPlan): number { if (plan.minimumCarbsG !== undefined) return plan.minimumCarbsG; return weight && plan.minimumCarbsPerKg ? Math.round(weight * plan.minimumCarbsPerKg) : 0; }
function optimizeMacroDistribution(targetKcal: number, protein: number, weight: number, plan: MacroPlan, minimumCarbsTarget: number, minimumFatTarget: number): { carbs: number; fat: number; kcal: number } {
  const proteinKcal = protein * 4;
  const remainingKcal = Math.max(0, targetKcal - proteinKcal);
  const referenceKcal = plan.referenceCarbsG * 4 + plan.referenceFatG * 9;
  const referenceCarbShare = referenceKcal ? (plan.referenceCarbsG * 4) / referenceKcal : 0.5;
  const preferredCarbs = remainingKcal * referenceCarbShare / 4;
  const minCarbs = Math.max(0, Math.ceil(minimumCarbsTarget));
  const maxCarbs = plan.carbCapPerKg !== undefined && weight ? Math.floor(weight * plan.carbCapPerKg) : Number.POSITIVE_INFINITY;
  const maxFat = Math.max(minimumFatTarget, Math.floor(Math.max(0, remainingKcal - minCarbs * 4) / 9));
  const candidateCarbs = new Set<number>();
  const addCarbCandidate = (value: number) => { if (Number.isFinite(value)) candidateCarbs.add(Math.round(value)); };
  addCarbCandidate(preferredCarbs);
  addCarbCandidate(minCarbs);
  if (Number.isFinite(maxCarbs)) addCarbCandidate(maxCarbs);
  addCarbCandidate((remainingKcal - minimumFatTarget * 9) / 4);
  for (let offset = -12; offset <= 12; offset += 1) addCarbCandidate(preferredCarbs + offset);

  let best: { carbs: number; fat: number; kcal: number } | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  candidateCarbs.forEach((candidateCarbsValue) => {
    if (candidateCarbsValue < minCarbs || candidateCarbsValue > maxCarbs) return;
    const preferredFat = (remainingKcal - candidateCarbsValue * 4) / 9;
    const candidateFats = new Set<number>([Math.floor(preferredFat), Math.ceil(preferredFat), Math.round(preferredFat), Math.ceil(minimumFatTarget), Math.floor(maxFat)]);
    candidateFats.forEach((candidateFat) => {
      if (!Number.isFinite(candidateFat) || candidateFat < minimumFatTarget || candidateFat > maxFat) return;
      const macroKcal = proteinKcal + candidateCarbsValue * 4 + candidateFat * 9;
      const strategyError = remainingKcal ? Math.abs((candidateCarbsValue * 4 / remainingKcal) - referenceCarbShare) : 0;
      const calorieError = Math.abs(targetKcal - macroKcal);
      const score = strategyError * 10000 + calorieError;
      if (score < bestScore) { bestScore = score; best = { carbs: candidateCarbsValue, fat: candidateFat, kcal: macroKcal }; }
    });
  });
  return best || { carbs: minCarbs, fat: minimumFatTarget, kcal: proteinKcal + minCarbs * 4 + minimumFatTarget * 9 };
}

export function calculateMacroTargets(profile: Profile, kcal: number, _dailyActivities: DayHabits['activities'] = [], proteinContext: ProteinCalculationContext = {}): MacroTargets {
  const targetKcal = Math.max(0, Math.round(kcal));
  if (targetKcal === 0) return { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  const weight = valid(profile.weightKg, 25, 300) ? profile.weightKg as number : 0;
  const style = profile.dietStyle || 'classic';
  const plan = macroPlan(style);
  const proteinRecommendation = calculateProteinTarget(profile, proteinContext);
  const protein = proteinRecommendation.targetGrams;
  const minimumFatTarget = minimumFat(profile, weight);
  const minimumCarbsTarget = minimumCarbs(weight, plan);
  const balanced = optimizeMacroDistribution(targetKcal, protein, weight, plan, minimumCarbsTarget, minimumFatTarget);
  const fiber = Math.round(clamp((targetKcal / 1000) * 14, 20, 40));
  const proteinKcal = protein * 4;
  const carbKcal = balanced.carbs * 4;
  const fatKcal = balanced.fat * 9;
  const totalMacroKcal = proteinKcal + carbKcal + fatKcal;
  return { kcal: balanced.kcal, protein, fat: balanced.fat, carbs: balanced.carbs, fiber, proteinDebug: proteinRecommendation.debug, macroDebug: { targetCalories: targetKcal, proteinTarget: protein, proteinKcal, carbTarget: balanced.carbs, carbKcal, fatTarget: balanced.fat, fatKcal, totalMacroKcal, differenceKcal: totalMacroKcal - targetKcal, dietStyle: style, strategy: plan.strategy } };
}
export function calculateDailyNutritionTargets(profile: Profile, habits: DayHabits, consumed: Nutrients, history?: HistoricalEnergyInput[]): DailyNutritionTargets { const energy = estimateEnergy(profile, habits, consumed, history); const effectiveSteps = habits.steps > 0 ? habits.steps : profile.usualStepsPerDay || 0; const macros = calculateMacroTargets(profile, energy.targetCalories, habits.activities, { dailySteps: effectiveSteps, dailyActivity: hasMeaningfulActivity(profile, habits.activities, effectiveSteps), dailyActivities: habits.activities, resistanceTraining: hasResistanceTraining(habits.activities) || undefined, energyBalanceKcal: energy.goalAdjustment }); return { energy, macros }; }
export function targetsWithDynamicMacros(profile: Profile, macros: MacroTargets): Targets { return { ...profile.targets, kcal: macros.kcal, protein: macros.protein, fat: macros.fat, carbs: macros.carbs, fiber: macros.fiber }; }
