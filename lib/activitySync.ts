import { ActivityIntensity, DayHabits } from '../types';

export type ActivityConnectionStatus = 'not-connected' | 'unavailable' | 'connected';

export interface ActivitySnapshot {
  steps?: number;
  distanceKm?: number;
  activeKcal?: number;
  activities?: DayHabits['activities'];
}

export interface ActivityHealthProvider {
  id: 'health-connect' | 'healthkit' | 'watch';
  label: string;
  status: ActivityConnectionStatus;
  readDay: (date: string) => Promise<ActivitySnapshot | null>;
}

export const activityProviders: ActivityHealthProvider[] = [];

export const ACTIVITY_TYPES = [
  'Marche', 'Marche rapide', 'Course à pied', 'Vélo', 'Natation', 'Randonnée',
  'Musculation', 'Calisthenics', 'Football', 'Basketball', 'Tennis', 'Escalade',
  'Rameur', 'Elliptique', 'HIIT', 'Yoga', 'Danse', 'Autre activité',
] as const;

const MET_BY_ACTIVITY: Record<string, number> = {
  Marche: 3.3, 'Marche rapide': 4.8, 'Course à pied': 8.3, Vélo: 7.5, Natation: 7, Randonnée: 6,
  Musculation: 5, Calisthenics: 7, Football: 7, Basketball: 7.5, Tennis: 7.3, Escalade: 8,
  Rameur: 7, Elliptique: 5.5, HIIT: 10, Yoga: 2.5, Danse: 5.5,
};

const INTENSITY_FACTOR: Record<ActivityIntensity, number> = { douce: 0.8, 'modérée': 1, intense: 1.2 };

export function estimateActivityCalories(name: string, minutes: number, weightKg: number | undefined, intensity: ActivityIntensity = 'modérée'): number | undefined {
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(weightKg) || (weightKg as number) <= 0) return undefined;
  const met = MET_BY_ACTIVITY[name] || 5;
  return Math.round((met * INTENSITY_FACTOR[intensity] - 1) * 3.5 * (weightKg as number) / 200 * minutes);
}

export function knownActiveCalories(habits: DayHabits): number | undefined {
  const recorded = habits.activities
    .map((activity) => activity.kcal)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return recorded.length ? Math.round(recorded.reduce((total, value) => total + value, 0)) : undefined;
}

export function activityDuration(habits: DayHabits): number {
  return habits.activities.reduce((total, activity) => total + activity.minutes, 0);
}
