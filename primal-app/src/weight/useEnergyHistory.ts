import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { todayKey } from '../lib/nutrition';
import { buildEnergyHistory } from './energyHistory';

/** Energy history for today's targets (recomputed when the journal or weigh-ins change). */
export function useEnergyHistory() {
  const { entriesForDate, habitsForDate } = useStore();
  return useMemo(() => buildEnergyHistory(todayKey(), entriesForDate, habitsForDate), [entriesForDate, habitsForDate]);
}
