import type { DayHabits, JournalEntry } from '../types';
import type { HistoricalEnergyInput } from '../lib/energy';
import { completeTotalForEntries, shiftDate } from '../lib/nutrition';

/**
 * Last 28 finished days (today excluded: it is not over) of logged calories and
 * weight, for the « real expenditure » estimate. A weigh-in stays valid until the
 * next one, so a weekly weigh-in is enough. Days without any food logged are left out.
 */
export function buildEnergyHistory(today: string, entriesForDate: (d: string) => JournalEntry[], habitsForDate: (d: string) => DayHabits): HistoricalEnergyInput[] {
  const days = Array.from({ length: 56 }, (_, i) => shiftDate(today, i - 56));
  let weight: number | undefined;
  const out: HistoricalEnergyInput[] = [];
  for (const date of days) {
    const w = habitsForDate(date).weight;
    if (typeof w === 'number' && Number.isFinite(w)) weight = w;
    if (weight === undefined) continue;
    // Only days with nothing logged are left out (weight still counts).
    const entries = entriesForDate(date);
    out.push({ date, consumedKcal: entries.length > 0 ? completeTotalForEntries(entries, 'kcal') : undefined, weightKg: weight });
  }
  return out.slice(-28);
}
