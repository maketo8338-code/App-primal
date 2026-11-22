import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { completeTotalForEntries, micronutrientStatuses, scoreTotalsForEntries, todayKey } from '../lib/nutrition';
import { computeDayScore } from '../lib/scoring';
import { useEnergyHistory } from '../weight/useEnergyHistory';
import { calculateDailyNutritionTargets, targetsWithDynamicMacros } from '../lib/energy';
import { hydrationTargetForDay, totalHydrationMl, waterFromEntries } from '../lib/healthTargets';

export interface DaySummary {
  date: string;
  score: number; scoreLabel: string; hasData: boolean;
  kcal?: number; kcalTarget: number;
  protein: number; proteinTarget: number;
  waterMl: number; waterTarget: number;
  /** Best-covered micronutrient of the day, if any. */
  highlight?: { label: string; percent: number };
}

/**
 * Today's figures for the share card — computed with exactly the same
 * functions and inputs as the Home screen, so both always agree.
 */
export function useDaySummary(): DaySummary {
  const { profile, entriesForDate, habitsForDate } = useStore();
  const energyHistory = useEnergyHistory();
  const date = todayKey();
  const entries = entriesForDate(date);
  const habits = habitsForDate(date);
  return useMemo(() => {
    const totals = scoreTotalsForEntries(entries);
    const dailyTargets = calculateDailyNutritionTargets(profile, habits, totals, energyHistory);
    const targets = { ...targetsWithDynamicMacros(profile, dailyTargets.macros), waterMl: hydrationTargetForDay(profile, habits) };
    const score = computeDayScore(totals, habits, targets);
    const best = micronutrientStatuses(entries, profile)
      .filter((item) => item.available && item.complete && item.percent !== undefined)
      .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))[0];
    return {
      date,
      score: score.score, scoreLabel: score.label, hasData: score.coverage > 0,
      kcal: completeTotalForEntries(entries, 'kcal'), kcalTarget: targets.kcal,
      protein: completeTotalForEntries(entries, 'protein') ?? 0, proteinTarget: targets.protein,
      waterMl: totalHydrationMl(habits.waterMl, waterFromEntries(entries)), waterTarget: targets.waterMl,
      highlight: best && (best.percent ?? 0) >= 50 ? { label: best.label, percent: best.percent ?? 0 } : undefined,
    };
  }, [date, entries, habits, profile, energyHistory]);
}
