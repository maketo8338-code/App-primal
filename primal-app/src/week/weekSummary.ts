import type { DayHabits, JournalEntry, NutrientKey, Profile } from '../types';
import { micronutrientStatuses, scoreTotalsForEntries, shiftDate } from '../lib/nutrition';
import { computeDayScore } from '../lib/scoring';
import { calculateDailyNutritionTargets, targetsWithDynamicMacros } from '../lib/energy';
import { hydrationTargetForDay, totalHydrationMl, waterFromEntries } from '../lib/healthTargets';

export interface WeekDay { date: string; logged: boolean; score: number; label: string; proteinReached: boolean; waterReached: boolean }
export interface WeekGap { key: NutrientKey; label: string; days: number; averagePercent: number }
export interface WeekSummary {
  days: WeekDay[];
  loggedDays: number;
  averageScore?: number;
  previousAverage?: number;
  best?: WeekDay;
  proteinDays: number;
  waterDays: number;
  /** Micronutrients most often under 50 % of the target on logged days. */
  gaps: WeekGap[];
}

const GAP_THRESHOLD = 50;

function dayResult(date: string, entriesForDate: (d: string) => JournalEntry[], habitsForDate: (d: string) => DayHabits, profile: Profile) {
  const entries = entriesForDate(date);
  const habits = habitsForDate(date);
  const totals = scoreTotalsForEntries(entries);
  const daily = calculateDailyNutritionTargets(profile, habits, totals);
  const targets = { ...targetsWithDynamicMacros(profile, daily.macros), waterMl: hydrationTargetForDay(profile, habits) };
  const score = computeDayScore(totals, habits, targets);
  return { entries, habits, totals, targets, score };
}

/**
 * Bilan des 7 derniers jours (aujourd'hui compris). Read-only: reuses the
 * existing score and micronutrient calculations without changing them.
 * A day counts as « logged » when at least one food was entered.
 */
export function buildWeekSummary(today: string, entriesForDate: (d: string) => JournalEntry[], habitsForDate: (d: string) => DayHabits, profile: Profile): WeekSummary {
  const gapCount = new Map<NutrientKey, { label: string; days: number; sum: number }>();
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(today, i - 6);
    const { entries, habits, totals, targets, score } = dayResult(date, entriesForDate, habitsForDate, profile);
    const logged = entries.length > 0;
    if (logged) {
      for (const status of micronutrientStatuses(entries, profile)) {
        if (!status.available || !status.complete || status.percent === undefined || status.percent >= GAP_THRESHOLD) continue;
        const current = gapCount.get(status.key) ?? { label: status.label, days: 0, sum: 0 };
        current.days += 1; current.sum += status.percent; gapCount.set(status.key, current);
      }
    }
    const water = totalHydrationMl(habits.waterMl, waterFromEntries(entries));
    return {
      date, logged, score: score.score, label: score.label,
      proteinReached: logged && targets.protein > 0 && (totals.protein ?? 0) >= targets.protein * 0.9,
      waterReached: targets.waterMl > 0 && water >= targets.waterMl,
    };
  });
  const logged = days.filter((d) => d.logged);
  const average = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : undefined;

  const previous = Array.from({ length: 7 }, (_, i) => shiftDate(today, i - 13))
    .map((date) => dayResult(date, entriesForDate, habitsForDate, profile))
    .filter((d) => d.entries.length > 0).map((d) => d.score.score);

  const gaps = [...gapCount.entries()]
    .map(([key, g]) => ({ key, label: g.label, days: g.days, averagePercent: Math.round(g.sum / g.days) }))
    .sort((a, b) => b.days - a.days || a.averagePercent - b.averagePercent)
    .slice(0, 3);

  return {
    days,
    loggedDays: logged.length,
    averageScore: average(logged.map((d) => d.score)),
    previousAverage: average(previous),
    best: logged.length ? logged.reduce((a, b) => (b.score > a.score ? b : a)) : undefined,
    proteinDays: days.filter((d) => d.proteinReached).length,
    waterDays: days.filter((d) => d.waterReached).length,
    gaps,
  };
}
