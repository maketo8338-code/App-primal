import { Profile } from '../types';

export type ProfileNumberField = 'age' | 'heightCm' | 'weightKg' | 'targetWeightKg' | 'usualStepsPerDay' | 'walkingMinutesPerDay' | 'bodyFatPercent';
type ProfileNumberInput = Partial<Record<ProfileNumberField, string | number | undefined>>;
interface FieldRule { label: string; min: number; max: number; unit: string; optional?: boolean; }
const RULES: Record<ProfileNumberField, FieldRule> = {
  age: { label: 'âge', min: 13, max: 120, unit: 'ans' },
  heightCm: { label: 'taille', min: 100, max: 230, unit: 'cm' },
  weightKg: { label: 'poids', min: 25, max: 300, unit: 'kg' },
  targetWeightKg: { label: 'poids cible', min: 25, max: 300, unit: 'kg', optional: true },
  usualStepsPerDay: { label: 'nombre de pas', min: 0, max: 100000, unit: 'pas', optional: true },
  walkingMinutesPerDay: { label: 'temps de marche', min: 0, max: 1440, unit: 'min', optional: true },
  bodyFatPercent: { label: 'masse grasse', min: 2, max: 70, unit: '%', optional: true },
};

export function parseProfileNumber(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value.replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}
export function validateProfileField(field: ProfileNumberField, value: string | number | undefined): string | undefined {
  const rule = RULES[field];
  const parsed = parseProfileNumber(value);
  if (parsed === undefined) return rule.optional ? undefined : `Renseigne ton ${rule.label} pour calculer tes objectifs.`;
  if (parsed < rule.min || parsed > rule.max) return `Indique un ${rule.label} réaliste entre ${rule.min} et ${rule.max} ${rule.unit}.`;
  return undefined;
}
export function validateProfileFields(values: ProfileNumberInput): string | undefined {
  for (const field of ['age', 'heightCm', 'weightKg'] as ProfileNumberField[]) { const error = validateProfileField(field, values[field]); if (error) return error; }
  return undefined;
}
export function hasCompleteProfile(profile: Pick<Profile, 'age' | 'heightCm' | 'weightKg' | 'sex'>): boolean {
  return validateProfileFields(profile) === undefined && (profile.sex === 'female' || profile.sex === 'male');
}
