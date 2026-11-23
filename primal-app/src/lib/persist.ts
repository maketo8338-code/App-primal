// Storage of the app state on the phone, split by month.
//
// v1 kept everything in one JSON value rewritten on every change. On Android a
// single value of about 2 MB can no longer be read back, which a heavy user would
// reach after roughly a year of logging. v2 stores:
//   primal.state.v2.meta          profile, favourites, reminders, list of months
//   primal.state.v2.m.YYYY-MM     that month's journal entries and daily habits
// Only the parts that changed are rewritten. The v1 value is migrated on first
// launch and removed only once the v2 data is safely written.
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_KEY = 'primal.state.v1';
const META_KEY = 'primal.state.v2.meta';
const MONTH_PREFIX = 'primal.state.v2.m.';

interface Snapshot { profile: unknown; entries: Array<{ date?: unknown }>; habits: Record<string, unknown>; favoriteFoods: unknown; notificationPreferences: unknown }
export interface LoadResult { data: unknown | null; ok: boolean }

const monthOf = (date: unknown) => (typeof date === 'string' && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : 'unknown');

/** Reads the saved state (v2, or v1 for a first launch after the update). ok = false means reading failed: do not save over it. */
export async function loadPersisted(): Promise<LoadResult> {
  try {
    const metaRaw = await AsyncStorage.getItem(META_KEY);
    if (!metaRaw) {
      const legacy = await AsyncStorage.getItem(LEGACY_KEY);
      if (!legacy) return { data: null, ok: true };
      return { data: JSON.parse(legacy), ok: true };
    }
    const meta = JSON.parse(metaRaw) as { months?: string[]; profile?: unknown; favoriteFoods?: unknown; notificationPreferences?: unknown };
    const months = Array.isArray(meta.months) ? meta.months.filter((m) => typeof m === 'string') : [];
    const pairs = months.length ? await AsyncStorage.multiGet(months.map((m) => MONTH_PREFIX + m)) : [];
    const entries: unknown[] = []; const habits: Record<string, unknown> = {};
    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        const part = JSON.parse(raw) as { entries?: unknown[]; habits?: Record<string, unknown> };
        if (Array.isArray(part.entries)) entries.push(...part.entries);
        if (part.habits && typeof part.habits === 'object') Object.assign(habits, part.habits);
      } catch { /* a damaged month is skipped; the others are kept */ }
    }
    return { data: { profile: meta.profile, favoriteFoods: meta.favoriteFoods, notificationPreferences: meta.notificationPreferences, entries, habits }, ok: true };
  } catch {
    return { data: null, ok: false };
  }
}

/** Last written value of each key, to rewrite only what changed. */
export type WriteCache = Map<string, string>;

export async function savePersisted(state: Snapshot, cache: WriteCache): Promise<void> {
  const byMonth = new Map<string, { entries: unknown[]; habits: Record<string, unknown> }>();
  const bucket = (m: string) => { let b = byMonth.get(m); if (!b) { b = { entries: [], habits: {} }; byMonth.set(m, b); } return b; };
  for (const entry of state.entries) bucket(monthOf(entry.date)).entries.push(entry);
  for (const [date, habit] of Object.entries(state.habits)) bucket(monthOf(date)).habits[date] = habit;
  const months = [...byMonth.keys()].sort();
  const writes: Array<[string, string]> = [];
  for (const m of months) {
    const value = JSON.stringify(byMonth.get(m));
    if (cache.get(MONTH_PREFIX + m) !== value) writes.push([MONTH_PREFIX + m, value]);
  }
  const meta = JSON.stringify({ version: 2, months, profile: state.profile, favoriteFoods: state.favoriteFoods, notificationPreferences: state.notificationPreferences });
  if (cache.get(META_KEY) !== meta) writes.push([META_KEY, meta]);
  // Months that no longer exist (e.g. after restoring a backup).
  const stale = [...cache.keys()].filter((k) => k.startsWith(MONTH_PREFIX) && !months.includes(k.slice(MONTH_PREFIX.length)));
  if (writes.length) await AsyncStorage.multiSet(writes);
  if (stale.length) await AsyncStorage.multiRemove(stale);
  for (const [k, v] of writes) cache.set(k, v);
  for (const k of stale) cache.delete(k);
  // First save after the migration: the v1 value is no longer needed.
  if (!cache.has('__legacyRemoved')) { await AsyncStorage.removeItem(LEGACY_KEY); cache.set('__legacyRemoved', '1'); }
}
