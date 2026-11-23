import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadPersisted, savePersisted, type WriteCache } from './persist';
import { DayHabits, DietStyleId, Food, JournalEntry, ManualActivity, NotificationKind, NotificationPreferences, Profile, Targets } from '../types';
import { calculateDietTargets } from './dietStyles';
import { estimateActivityCalories } from './activitySync';
import { calculateProgression } from './progression';
import { normalizeDayHabits, normalizeFood, normalizeJournalEntry, normalizeManualActivity, normalizePersistedState, normalizeProfile, normalizeTargetOverrides, normalizeTargets, STORAGE_LIMITS } from './safeStorage';


export const DEFAULT_TARGETS: Targets = {
  kcal: 2600,
  protein: 160,
  carbs: 300,
  fat: 90,
  fiber: 30,
  waterMl: 2500,
  steps: 10000,
  sleepH: 8,
  outdoorMin: 45,
};

const DEFAULT_PROFILE: Profile = {
  firstName: '',
  avatarUri: undefined,
  goal: 'health',
  activityLevel: 'moderate',
  dietStyle: 'classic',
  targets: DEFAULT_TARGETS,
  targetOverrides: {},
  onboarded: false,
};

export const EMPTY_HABITS: DayHabits = { waterMl: 0, waterEntries: [], steps: 0, outdoorMin: 0, sleepH: 0, activities: [] };

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { hydration: false, meal: false, activity: false, sleep: false, insight: false, quietStart: 22, quietEnd: 7 };

export interface State {
  profile: Profile;
  entries: JournalEntry[];
  habits: Record<string, DayHabits>;
  favoriteFoods: Food[];
  notificationPreferences: NotificationPreferences;
}

interface StoreCtx extends State {
  ready: boolean;
  entriesForDate: (date: string) => JournalEntry[];
  habitsForDate: (date: string) => DayHabits;
  favoriteFoods: Food[];
  toggleFavorite: (food: Food) => void;
  isFavorite: (food: Food) => boolean;
  setNotificationPreference: (kind: NotificationKind, enabled: boolean) => void;
  addEntry: (e: Omit<JournalEntry, 'id'>) => void;
  updateEntry: (id: string, patch: Partial<Pick<JournalEntry, 'grams' | 'meal'>>) => void;
  removeEntry: (id: string) => void;
  addWater: (date: string, ml: number) => void;
  addWaterEntry: (date: string, ml: number) => void;
  updateWaterEntry: (date: string, id: string, ml: number) => void;
  removeWaterEntry: (date: string, id: string) => void;
  setHabit: (date: string, patch: Partial<DayHabits>) => void;
  addActivity: (date: string, a: Omit<ManualActivity, 'id'>) => void;
  removeActivity: (date: string, id: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateTargets: (patch: Partial<Targets>) => void;
  setDietStyle: (style: DietStyleId) => void;
  /** Everything to put in a backup file. */
  snapshot: () => State;
  /** Replaces all data with a backup's content (validated like on start-up). Returns false if unusable. */
  restoreBackup: (data: unknown) => boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

let idSeq = 0;
function uid(): string {
  idSeq += 1;
  return `${Date.now().toString(36)}-${idSeq}`;
}

/** Validates saved data (from storage or from a backup file) exactly as on start-up. */
function stateFromPersisted(parsed: unknown): State {
  const restored = normalizePersistedState(parsed, { profile: DEFAULT_PROFILE, targets: DEFAULT_TARGETS, notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES });
  const completeEnough = Boolean(restored.profile.age && restored.profile.heightCm && restored.profile.weightKg && (restored.profile.sex === 'female' || restored.profile.sex === 'male' || restored.profile.bodyFatPercent));
  const recalculated = completeEnough ? calculateDietTargets(restored.profile, restored.profile.dietStyle || 'classic') : restored.profile.targets;
  const overrides = restored.profile.targetOverrides || {};
  const targets = { ...recalculated, waterMl: overrides.waterMl ?? recalculated.waterMl, steps: overrides.steps ?? recalculated.steps, sleepH: overrides.sleepH ?? recalculated.sleepH, sleepMaxH: overrides.sleepMaxH, outdoorMin: overrides.outdoorMin ?? recalculated.outdoorMin };
  return {
    profile: completeEnough ? { ...restored.profile, targets, targetOverrides: { waterMl: targets.waterMl, steps: targets.steps, sleepH: targets.sleepH, sleepMaxH: targets.sleepMaxH, outdoorMin: targets.outdoorMin } } : restored.profile,
    entries: restored.entries,
    habits: restored.habits,
    favoriteFoods: restored.favoriteFoods,
    notificationPreferences: restored.notificationPreferences,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ profile: DEFAULT_PROFILE, entries: [], habits: {}, favoriteFoods: [], notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES });
  const [ready, setReady] = useState(false);

  // Saving is allowed only once the saved data was read successfully: if reading
  // failed, saving the empty start state would erase the user's journal.
  const canSave = useRef(false);
  const writeCache = useRef<WriteCache>(new Map());
  const saving = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    loadPersisted()
      .then(({ data, ok }) => {
        canSave.current = ok;
        if (data) setState(stateFromPersisted(data));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !canSave.current) return;
    // One save at a time, in order; only the months that changed are rewritten.
    saving.current = saving.current.then(() => savePersisted(state, writeCache.current)).catch(() => {});
  }, [state, ready]);

  const entriesForDate = useCallback(
    (date: string) => state.entries.filter((e) => e.date === date),
    [state.entries],
  );

  const habitsForDate = useCallback(
    (date: string) => normalizeDayHabits(state.habits[date]),
    [state.habits],
  );

  const addEntry = useCallback((e: Omit<JournalEntry, 'id'>) => {
    const normalized = normalizeJournalEntry({ ...e, id: uid() });
    if (!normalized) return;
    setState((s) => ({ ...s, entries: [...s.entries, normalized] }));
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<Pick<JournalEntry, 'grams' | 'meal'>>) => {
    setState((s) => ({ ...s, entries: s.entries.map((entry) => {
      if (entry.id !== id) return entry;
      const grams = patch.grams === undefined ? entry.grams : Math.min(STORAGE_LIMITS.grams, Math.max(1, Number.isFinite(patch.grams) ? patch.grams : entry.grams));
      const meal = patch.meal === undefined ? entry.meal : patch.meal;
      return { ...entry, grams, meal };
    }) }));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
  }, []);

  const toggleFavorite = useCallback((food: Food) => {
    const normalized = normalizeFood(food);
    if (!normalized) return;
    setState((s) => {
      const key = `${normalized.source}:${normalized.id}`;
      const exists = s.favoriteFoods.some((item) => `${item.source}:${item.id}` === key);
      return { ...s, favoriteFoods: exists ? s.favoriteFoods.filter((item) => `${item.source}:${item.id}` !== key) : [normalized, ...s.favoriteFoods] };
    });
  }, []);

  const isFavorite = useCallback((food: Food) => {
    const key = `${food.source}:${food.id}`;
    return state.favoriteFoods.some((item) => `${item.source}:${item.id}` === key);
  }, [state.favoriteFoods]);

  const setNotificationPreference = useCallback((kind: NotificationKind, enabled: boolean) => {
    setState((s) => ({ ...s, notificationPreferences: { ...s.notificationPreferences, [kind]: enabled === true } }));
  }, []);

  const patchHabits = useCallback((date: string, fn: (h: DayHabits) => DayHabits) => {
    setState((s) => {
      const current = normalizeDayHabits(s.habits[date]);
      return { ...s, habits: { ...s.habits, [date]: normalizeDayHabits(fn(current)) } };
    });
  }, []);

  const addWater = useCallback(
    (date: string, ml: number) => {
      if (!Number.isFinite(ml)) return;
      const delta = Math.max(-STORAGE_LIMITS.waterMl, Math.min(STORAGE_LIMITS.waterMl, ml));
      patchHabits(date, (h) => ({ ...h, waterMl: Math.max(0, Math.min(STORAGE_LIMITS.waterMl, h.waterMl + delta)) }));
    },
    [patchHabits],
  );

  const addWaterEntry = useCallback(
    (date: string, ml: number) => {
      if (!Number.isFinite(ml) || ml <= 0) return;
      const safeMl = Math.min(STORAGE_LIMITS.waterMl, ml);
      patchHabits(date, (h) => ({ ...h, waterMl: Math.min(STORAGE_LIMITS.waterMl, h.waterMl + safeMl), waterEntries: [...h.waterEntries, { id: uid(), ml: safeMl }] }));
    },
    [patchHabits],
  );

  const updateWaterEntry = useCallback(
    (date: string, id: string, ml: number) => {
      if (!Number.isFinite(ml) || ml <= 0) return;
      const safeMl = Math.min(STORAGE_LIMITS.waterMl, ml);
      patchHabits(date, (h) => {
        const previous = h.waterEntries.find((entry) => entry.id === id);
        if (!previous) return h;
        return { ...h, waterMl: Math.max(0, Math.min(STORAGE_LIMITS.waterMl, h.waterMl + safeMl - previous.ml)), waterEntries: h.waterEntries.map((entry) => entry.id === id ? { ...entry, ml: safeMl } : entry) };
      });
    },
    [patchHabits],
  );

  const removeWaterEntry = useCallback(
    (date: string, id: string) => patchHabits(date, (h) => {
      const previous = h.waterEntries.find((entry) => entry.id === id);
      if (!previous) return h;
      return { ...h, waterMl: Math.max(0, h.waterMl - previous.ml), waterEntries: h.waterEntries.filter((entry) => entry.id !== id) };
    }),
    [patchHabits],
  );

  const setHabit = useCallback(
    (date: string, patch: Partial<DayHabits>) => patchHabits(date, (h) => ({ ...h, ...patch })),
    [patchHabits],
  );

  const addActivity = useCallback(
    (date: string, a: Omit<ManualActivity, 'id'>) => {
      const candidate = { ...a, kcal: a.kcal ?? estimateActivityCalories(a.name, a.minutes, state.profile.weightKg, a.intensity), id: uid() };
      const normalized = normalizeManualActivity(candidate);
      if (!normalized) return;
      patchHabits(date, (h) => ({ ...h, activities: [...h.activities, normalized] }));
    },
    [patchHabits, state.profile.weightKg],
  );

  const removeActivity = useCallback(
    (date: string, id: string) => patchHabits(date, (h) => ({ ...h, activities: h.activities.filter((activity) => activity.id !== id) })),
    [patchHabits],
  );

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => {
      const profile = normalizeProfile({ ...s.profile, ...patch }, s.profile, s.profile.targets);
      const changesTargets = ['age', 'heightCm', 'weightKg', 'sex', 'goal', 'targetWeightKg', 'customGoalAdjustmentKcal', 'activityLevel', 'usualStepsPerDay', 'workActivity', 'walkingMinutesPerDay', 'recurringActivities', 'bodyFatPercent', 'dietStyle'].some((key) => key in patch);
      const completeEnough = Boolean(profile.age && profile.heightCm && profile.weightKg && (profile.sex === 'female' || profile.sex === 'male' || profile.bodyFatPercent));
      const recalculated = changesTargets && completeEnough ? calculateDietTargets(profile, profile.dietStyle || 'classic') : profile.targets;
      const overrides = profile.targetOverrides || {};
      const targets = { ...recalculated, waterMl: overrides.waterMl ?? recalculated.waterMl, steps: overrides.steps ?? recalculated.steps, sleepH: overrides.sleepH ?? recalculated.sleepH, sleepMaxH: overrides.sleepMaxH, outdoorMin: overrides.outdoorMin ?? recalculated.outdoorMin };
      return { ...s, profile: changesTargets && completeEnough ? { ...profile, targets, targetOverrides: { waterMl: targets.waterMl, steps: targets.steps, sleepH: targets.sleepH, sleepMaxH: targets.sleepMaxH, outdoorMin: targets.outdoorMin } } : profile };
    });
  }, []);

  const updateTargets = useCallback((patch: Partial<Targets>) => {
    const cleanPatch = normalizeTargetOverrides(patch);
    setState((s) => {
      const targets = normalizeTargets({ ...s.profile.targets, ...cleanPatch }, s.profile.targets);
      return { ...s, profile: { ...s.profile, targets, targetOverrides: { ...(s.profile.targetOverrides || {}), ...cleanPatch } } };
    });
  }, []);

  const setDietStyle = useCallback((style: DietStyleId) => {
    setState((s) => {
      const profile = normalizeProfile({ ...s.profile, dietStyle: style }, s.profile, s.profile.targets);
      const completeEnough = Boolean(profile.age && profile.heightCm && profile.weightKg && (profile.sex === 'female' || profile.sex === 'male' || profile.bodyFatPercent));
      const recalculated = calculateDietTargets(profile, profile.dietStyle || 'classic');
      const overrides = profile.targetOverrides || {};
      const targets = { ...recalculated, waterMl: overrides.waterMl ?? recalculated.waterMl, steps: overrides.steps ?? recalculated.steps, sleepH: overrides.sleepH ?? recalculated.sleepH, sleepMaxH: overrides.sleepMaxH, outdoorMin: overrides.outdoorMin ?? recalculated.outdoorMin };
      return { ...s, profile: completeEnough ? { ...profile, targets, targetOverrides: { waterMl: targets.waterMl, steps: targets.steps, sleepH: targets.sleepH, sleepMaxH: targets.sleepMaxH, outdoorMin: targets.outdoorMin } } : profile };
    });
  }, []);

  const snapshot = useCallback(() => state, [state]);
  const restoreBackup = useCallback((data: unknown) => {
    if (!data || typeof data !== 'object') return false;
    const next = stateFromPersisted(data);
    if (!next.profile.onboarded && next.entries.length === 0) return false; // nothing usable in the file
    setState(next);
    return true;
  }, []);

  const value = useMemo<StoreCtx>(
    () => ({
      ...state,
      snapshot,
      restoreBackup,
      ready,
      entriesForDate,
      habitsForDate,
             addEntry,
       updateEntry,
       removeEntry,
       toggleFavorite,
              isFavorite,
       setNotificationPreference,
       addWater,
      addWaterEntry,
      updateWaterEntry,
      removeWaterEntry,
             setHabit,
       addActivity,
       removeActivity,
              updateProfile,
       updateTargets,
       setDietStyle,
    }),
    [state, ready, snapshot, restoreBackup, entriesForDate, habitsForDate, addEntry, updateEntry, removeEntry, toggleFavorite, isFavorite, setNotificationPreference, addWater, addWaterEntry, updateWaterEntry, removeWaterEntry, setHabit, addActivity, removeActivity, updateProfile, updateTargets, setDietStyle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// API de compatibilité : les résultats proviennent du même moteur vérifiable que le Profil.
export function computeLevel(entries: JournalEntry[], habits: Record<string, DayHabits>): { level: number; xp: number; nextXp: number } {
  const progression = calculateProgression(entries, habits, DEFAULT_TARGETS);
  return { level: progression.level, xp: progression.currentXp, nextXp: progression.nextLevelXp };
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  androidIcon: string;
  earned: boolean;
}

export function computeBadges(entries: JournalEntry[], habits: Record<string, DayHabits>, targets: Targets): Badge[] {
  return calculateProgression(entries, habits, targets).badges.map((badge) => ({ id: badge.id, label: badge.label, icon: badge.icon, androidIcon: badge.androidIcon, earned: badge.earned }));
}
