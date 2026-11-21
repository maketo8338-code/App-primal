import { SleepSource } from '../types';

export type SleepConnectionStatus = 'not-connected' | 'unavailable' | 'connected';

export interface SleepSnapshot {
  durationHours?: number;
  bedtime?: string;
  wakeTime?: string;
  source: SleepSource;
}

export interface SleepHealthProvider {
  id: 'health-connect' | 'healthkit' | 'watch';
  label: string;
  status: SleepConnectionStatus;
  readNight: (date: string) => Promise<SleepSnapshot | null>;
}

// Point d’extension pour Santé / Health Connect / montres : aucune donnée n’est inventée.
export const sleepProviders: SleepHealthProvider[] = [];

export function formatSleepDuration(hours: number): string {
  if (hours <= 0) return '—';
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60}`.replace(/ 0$/, '');
}

export function parseSleepDurationInput(input: string): number | undefined {
  const value = input.trim().toLowerCase().replace(',', '.');
  const clock = value.match(/^(\d{1,2})\s*[:h]\s*(\d{1,2})$/);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (minutes < 60) return hours + minutes / 60;
  }
  const decimal = Number(value.replace(/h/g, '').trim());
  return Number.isFinite(decimal) && decimal > 0 ? decimal : undefined;
}

export function sleepProgress(hours: number, targetHours: number): number | undefined {
  if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(targetHours) || targetHours <= 0) return undefined;
  return Math.min(100, Math.round((hours / targetHours) * 100));
}

export function sleepRegularity(hours: number[]): number | undefined {
  const known = hours.filter((value) => value > 0);
  if (known.length < 2) return undefined;
  const average = known.reduce((total, value) => total + value, 0) / known.length;
  const deviation = Math.sqrt(known.reduce((total, value) => total + Math.pow(value - average, 2), 0) / known.length);
  return Math.max(0, Math.round(100 - deviation * 20));
}
