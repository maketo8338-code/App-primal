import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayHabits, JournalEntry, NotificationKind, NotificationPreferences, Targets } from '../types';
import { cancelReminder, scheduleReminder } from '../zzz/notifications';
import { completeTotalForEntries, todayKey } from './nutrition';
import { normalizeDayHabits } from './safeStorage';

interface NotificationState { entries: JournalEntry[]; habits: Record<string, DayHabits>; targets: Targets; preferences: NotificationPreferences; }
interface Candidate { kind: NotificationKind; title: string; body: string; hour: number; minute: number; }
interface StoredNotifications { key?: string; ids?: string[]; }

const STORAGE_KEY = 'primal.notifications.v1';
const MINUTE = 60 * 1000;
function nextToday(hour: number, minute: number, now = new Date()): Date | null { const date = new Date(now); date.setHours(hour, minute, 0, 0); return date.getTime() > now.getTime() + MINUTE ? date : null; }
function inQuietHours(hour: number, prefs: NotificationPreferences): boolean { if (prefs.quietStart === prefs.quietEnd) return false; return prefs.quietStart > prefs.quietEnd ? hour >= prefs.quietStart || hour < prefs.quietEnd : hour >= prefs.quietStart && hour < prefs.quietEnd; }
function safeDate(hour: number, minute: number, prefs: NotificationPreferences, now: Date): Date | null { let candidate = nextToday(hour, minute, now); if (!candidate) return null; if (inQuietHours(candidate.getHours(), prefs)) { const wake = nextToday(prefs.quietEnd, 5, now); candidate = wake || nextToday(prefs.quietEnd, 5, new Date(now.getTime() + 24 * 60 * MINUTE)); } return candidate; }
function normalizedHabits(value?: DayHabits): DayHabits { return normalizeDayHabits(value); }
function candidates(state: NotificationState, now = new Date()): Candidate[] { const date = todayKey(); const entries = state.entries.filter((entry) => entry.date === date); const habits = normalizedHabits(state.habits[date]); const protein = completeTotalForEntries(entries, 'protein'); const out: Candidate[] = [];
  if (state.preferences.hydration && state.targets.waterMl > 0 && habits.waterMl < state.targets.waterMl * 0.65) out.push({ kind: 'hydration', title: 'Un petit rappel d’eau', body: 'Tu es encore un peu en dessous de ta cible aujourd’hui.', hour: 15, minute: 30 });
  if (state.preferences.meal && entries.length < 2) out.push({ kind: 'meal', title: 'Ton journal t’attend', body: 'Ajoute ton prochain repas quand tu as un moment.', hour: 12, minute: 45 });
  if (state.preferences.activity && state.targets.steps > 0 && habits.steps < state.targets.steps * 0.55 && habits.activities.length === 0) out.push({ kind: 'activity', title: 'Un peu de mouvement ?', body: 'Quelques minutes d’activité peuvent compléter ta journée.', hour: 17, minute: 30 });
  if (state.preferences.sleep && habits.sleepH <= 0) out.push({ kind: 'sleep', title: 'Pense à renseigner ton sommeil', body: 'Cela aide PRIMAL à suivre ta journée plus justement.', hour: 20, minute: 30 });
  if (state.preferences.insight && entries.length > 0 && state.targets.protein > 0 && protein !== undefined && protein < state.targets.protein * 0.55) out.push({ kind: 'insight', title: 'Repère nutritionnel', body: 'Une source de protéines peut compléter ton prochain repas.', hour: 18, minute: 15 });
  return out;
}

async function readStored(): Promise<StoredNotifications> {
  try {
    const parsed: unknown = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const value = parsed as { key?: unknown; ids?: unknown };
    const key = typeof value.key === 'string' && value.key.length <= 2000 ? value.key : undefined;
    const ids = Array.isArray(value.ids) ? value.ids.filter((id): id is string => typeof id === 'string' && id.length <= 200).slice(0, 100) : undefined;
    return { key, ids };
  } catch {
    return {};
  }
}
async function cancelStored(ids?: string[]): Promise<void> { for (const id of ids || []) { try { await cancelReminder(id); } catch {} } }

export async function syncSmartNotifications(state: NotificationState): Promise<void> {
  const previous = await readStored();
  const enabled = [state.preferences.hydration, state.preferences.meal, state.preferences.activity, state.preferences.sleep, state.preferences.insight].some(Boolean);
  if (!enabled) { await cancelStored(previous.ids); await AsyncStorage.removeItem(STORAGE_KEY); return; }
  const date = todayKey();
  const currentHabits = normalizedHabits(state.habits[date]);
  const currentEntries = state.entries.filter((entry) => entry.date === date);
  const currentProtein = completeTotalForEntries(currentEntries, 'protein');
  const currentKey = JSON.stringify([date, state.preferences.hydration, state.preferences.meal, state.preferences.activity, state.preferences.sleep, state.preferences.insight, state.preferences.quietStart, state.preferences.quietEnd, state.targets.waterMl, state.targets.steps, state.targets.protein, currentHabits.waterMl, currentHabits.steps, currentHabits.sleepH, currentHabits.activities.length, currentEntries.length, currentProtein]);
  if (previous.ids?.length && previous.key === currentKey) return;
  await cancelStored(previous.ids);
  const scheduled: string[] = [];
  for (const item of candidates(state)) { const date = safeDate(item.hour, item.minute, state.preferences, new Date()); if (!date) continue; const result = await scheduleReminder({ title: item.title, body: item.body, date }); if (result.ok) scheduled.push(result.id); }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key: currentKey, ids: scheduled }));
}

export function notificationCandidatesForTest(state: NotificationState): Candidate[] { return candidates(state); }
