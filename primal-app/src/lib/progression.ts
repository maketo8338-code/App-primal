import { DayHabits, JournalEntry, Targets } from '../types';
import { completeTotalForEntries, shiftDate, todayKey } from './nutrition';

export interface ProgressBadge { id: string; label: string; description: string; icon: string; androidIcon: string; earned: boolean; unlockedOn?: string; }
export interface Achievement { id: string; label: string; date: string; icon: string; androidIcon: string; }
export interface Progression { level: number; totalXp: number; currentXp: number; nextLevelXp: number; progress: number; currentStreak: number; bestStreak: number; journalDays: number; badges: ProgressBadge[]; history: Achievement[]; }

function hasActivity(habit: DayHabits | undefined): boolean { return !!habit && (habit.waterMl > 0 || habit.steps > 0 || habit.sleepH > 0 || habit.outdoorMin > 0 || habit.activities.length > 0); }
function targetReached(value: number, target: number): boolean { return target > 0 && value >= target; }
function journalDays(entries: JournalEntry[]): Set<string> { return new Set(entries.map((entry) => entry.date)); }
function activeDays(entries: JournalEntry[], habits: Record<string, DayHabits>): Set<string> { const days = journalDays(entries); Object.keys(habits).forEach((date) => { if (hasActivity(habits[date])) days.add(date); }); return days; }
function dateList(days: Set<string>): string[] { return Array.from(days).sort(); }
function dayEntries(entries: JournalEntry[], date: string): JournalEntry[] { return entries.filter((entry) => entry.date === date); }
function dayQualifies(entries: JournalEntry[], habits: Record<string, DayHabits>, date: string): boolean { return journalDays(entries).has(date) || hasActivity(habits[date]); }
function streakFrom(days: Set<string>, endDate: string): number { let count = 0; for (let i = 0; i < 366; i += 1) { if (!days.has(shiftDate(endDate, -i))) break; count += 1; } return count; }
function bestStreak(days: Set<string>): number { let best = 0; dateList(days).forEach((date) => { const previous = shiftDate(date, -1); if (!days.has(previous)) best = Math.max(best, streakFrom(days, date)); }); return best; }
function firstMatching(dates: string[], predicate: (date: string) => boolean): string | undefined { return dates.find(predicate); }
function isBalanced(entries: JournalEntry[], targets: Targets, date: string): boolean { const list = dayEntries(entries, date); const kcal = completeTotalForEntries(list, 'kcal'); const protein = completeTotalForEntries(list, 'protein'); return list.length >= 2 && kcal !== undefined && protein !== undefined && targetReached(kcal, targets.kcal * 0.8) && kcal <= targets.kcal * 1.2 && targetReached(protein, targets.protein * 0.8); }
function activeWeek(days: Set<string>, habits: Record<string, DayHabits>, endDate: string, targets: Targets): boolean { let count = 0; for (let i = 0; i < 7; i += 1) { const date = shiftDate(endDate, -i); const habit = habits[date]; if (targetReached(habit?.steps || 0, targets.steps) || (habit?.activities || []).some((activity) => activity.minutes >= 20)) count += 1; } return count >= 5; }

export function calculateProgression(entries: JournalEntry[], habits: Record<string, DayHabits>, targets: Targets): Progression {
  const journal = journalDays(entries);
  const active = activeDays(entries, habits);
  const dates = dateList(active);
  const allDates = Array.from(new Set([...dates, ...Object.keys(habits), ...Array.from(journal)])).sort();
  const currentStreak = streakFrom(active, todayKey());
  const best = bestStreak(active);
  let totalXp = 0;
  allDates.forEach((date) => {
    const list = dayEntries(entries, date);
    const habit = habits[date];
    const protein = completeTotalForEntries(list, 'protein');
    if (journal.has(date)) totalXp += 10;
    if (targetReached(habit?.waterMl || 0, targets.waterMl)) totalXp += 15;
    if (protein !== undefined && targetReached(protein, targets.protein)) totalXp += 15;
    if (isBalanced(entries, targets, date)) totalXp += 15;
    if (targetReached(habit?.steps || 0, targets.steps) || (habit?.activities || []).length > 0) totalXp += 15;
    if (targetReached(habit?.sleepH || 0, targets.sleepH)) totalXp += 10;
    if (targetReached(habit?.outdoorMin || 0, targets.outdoorMin)) totalXp += 10;
  });
  const level = Math.floor(totalXp / 100) + 1;
  const currentXp = totalXp % 100;
  const history: Achievement[] = [];
  const addHistory = (id: string, label: string, date: string | undefined, icon: string, androidIcon: string) => { if (date) history.push({ id, label, date, icon, androidIcon }); };
  addHistory('streak7', '7 jours consécutifs', firstMatching(allDates, (date) => streakFrom(active, date) >= 7), 'flame.fill', 'flame');
  addHistory('water', 'Objectif hydratation atteint', firstMatching(allDates, (date) => targetReached(habits[date]?.waterMl || 0, targets.waterMl)), 'drop.fill', 'water');
  addHistory('protein', 'Objectif protéines atteint', firstMatching(allDates, (date) => { const protein = completeTotalForEntries(dayEntries(entries, date), 'protein'); return protein !== undefined && targetReached(protein, targets.protein); }), 'bolt.fill', 'flash');
  addHistory('balanced', 'Journée nutritionnelle équilibrée', firstMatching(allDates, (date) => isBalanced(entries, targets, date)), 'checkmark.circle.fill', 'checkmark-circle');
  addHistory('activeWeek', 'Semaine active', firstMatching(allDates, (date) => activeWeek(active, habits, date, targets)), 'figure.walk', 'walk');
  addHistory('journal30', '30 jours de journal', firstMatching(allDates, (date) => Array.from(journal).filter((day) => day <= date).length >= 30), 'book.fill', 'book');
  addHistory('streak14', '14 jours consécutifs', firstMatching(allDates, (date) => streakFrom(active, date) >= 14), 'flame.fill', 'flame');
  history.sort((a, b) => b.date.localeCompare(a.date));
  const historyById = new Map(history.map((item) => [item.id, item.date]));
  const badges: ProgressBadge[] = [
    { id: 'streak7', label: '7 jours consécutifs', description: 'Maintenir un rythme suivi pendant 7 jours.', icon: 'flame.fill', androidIcon: 'flame', earned: !!historyById.get('streak7'), unlockedOn: historyById.get('streak7') },
    { id: 'water', label: 'Hydratation atteinte', description: 'Atteindre ta cible d’eau sur une journée.', icon: 'drop.fill', androidIcon: 'water', earned: !!historyById.get('water'), unlockedOn: historyById.get('water') },
    { id: 'protein', label: 'Protéines atteintes', description: 'Atteindre ta cible de protéines.', icon: 'bolt.fill', androidIcon: 'flash', earned: !!historyById.get('protein'), unlockedOn: historyById.get('protein') },
    { id: 'balanced', label: 'Journée équilibrée', description: 'Journal renseigné, calories et protéines cohérentes.', icon: 'checkmark.circle.fill', androidIcon: 'checkmark-circle', earned: !!historyById.get('balanced'), unlockedOn: historyById.get('balanced') },
    { id: 'activeWeek', label: 'Semaine active', description: 'Atteindre 5 jours actifs sur une même semaine.', icon: 'figure.walk', androidIcon: 'walk', earned: !!historyById.get('activeWeek'), unlockedOn: historyById.get('activeWeek') },
    { id: 'journal30', label: '30 jours de journal', description: 'Renseigner le journal pendant 30 jours.', icon: 'book.fill', androidIcon: 'book', earned: !!historyById.get('journal30'), unlockedOn: historyById.get('journal30') },
    { id: 'streak14', label: '14 jours consécutifs', description: 'Maintenir un rythme suivi pendant 14 jours.', icon: 'flame.fill', androidIcon: 'flame', earned: !!historyById.get('streak14'), unlockedOn: historyById.get('streak14') },
  ];
  return { level, totalXp, currentXp, nextLevelXp: 100, progress: currentXp, currentStreak, bestStreak: best, journalDays: journal.size, badges, history };
}
