import { JournalEntry, MealId, NutrientKey, Nutrients, Profile } from '../types';
import { nutrientTargetForProfile } from './micronutrients';

export type NutrientGroup = 'macro' | 'vitamin' | 'mineral' | 'other';

export interface NutrientMeta {
  key: NutrientKey;
  label: string;
  unit: 'kcal' | 'g' | 'mg' | 'µg' | 'L';
  rda: number; // apport journalier de référence (adulte)
  group: NutrientGroup;
  isLimit?: boolean; // valeur à ne pas dépasser plutôt qu'à atteindre
  sources?: string; // principales sources alimentaires
}

export const NUTRIENTS: NutrientMeta[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', rda: 2200, group: 'macro' },
  { key: 'protein', label: 'Protéines', unit: 'g', rda: 110, group: 'macro', sources: 'Viandes, poissons, œufs, produits laitiers, légumineuses' },
  { key: 'carbs', label: 'Glucides', unit: 'g', rda: 275, group: 'macro', sources: 'Céréales, fruits, légumineuses, tubercules' },
  { key: 'fat', label: 'Lipides', unit: 'g', rda: 80, group: 'macro', sources: 'Huiles, noix, poissons gras, avocat' },
  { key: 'fiber', label: 'Fibres', unit: 'g', rda: 30, group: 'other', sources: 'Légumes, fruits, céréales complètes, légumineuses' },
  { key: 'sugar', label: 'Sucres', unit: 'g', rda: 50, group: 'other', isLimit: true, sources: 'Fruits, produits sucrés' },
  { key: 'satFat', label: 'Graisses saturées', unit: 'g', rda: 25, group: 'other', isLimit: true, sources: 'Beurre, fromages, viandes grasses' },
  { key: 'omega3', label: 'Oméga-3', unit: 'g', rda: 1.6, group: 'other', sources: 'Poissons gras, noix, graines de lin, colza' },
  { key: 'vitA', label: 'Vitamine A', unit: 'µg', rda: 900, group: 'vitamin', sources: 'Foie, carotte, patate douce, épinards' },
  { key: 'vitB1', label: 'Vitamine B1', unit: 'mg', rda: 1.2, group: 'vitamin', sources: 'Céréales complètes, porc, légumineuses' },
  { key: 'vitB2', label: 'Vitamine B2', unit: 'mg', rda: 1.3, group: 'vitamin', sources: 'Produits laitiers, œufs, abats' },
  { key: 'vitB3', label: 'Vitamine B3', unit: 'mg', rda: 16, group: 'vitamin', sources: 'Volaille, thon, arachides' },
  { key: 'vitB5', label: 'Vitamine B5', unit: 'mg', rda: 5, group: 'vitamin', sources: 'Abats, champignons, avocat' },
  { key: 'vitB6', label: 'Vitamine B6', unit: 'mg', rda: 1.7, group: 'vitamin', sources: 'Volaille, poissons, banane, pois chiches' },
  { key: 'vitB7', label: 'Vitamine B7', unit: 'µg', rda: 30, group: 'vitamin', sources: 'Œufs, foie, noix, graines' },
  { key: 'vitB9', label: 'Vitamine B9', unit: 'µg', rda: 400, group: 'vitamin', sources: 'Légumes verts, légumineuses, foie' },
  { key: 'vitB12', label: 'Vitamine B12', unit: 'µg', rda: 2.4, group: 'vitamin', sources: 'Viandes, poissons, œufs, laitages' },
  { key: 'vitC', label: 'Vitamine C', unit: 'mg', rda: 90, group: 'vitamin', sources: 'Kiwi, agrumes, poivron, brocoli' },
  { key: 'vitD', label: 'Vitamine D', unit: 'µg', rda: 15, group: 'vitamin', sources: 'Poissons gras, jaune d’œuf, exposition au soleil' },
  { key: 'vitE', label: 'Vitamine E', unit: 'mg', rda: 15, group: 'vitamin', sources: 'Huiles végétales, amandes, graines de tournesol' },
  { key: 'vitK', label: 'Vitamine K', unit: 'µg', rda: 120, group: 'vitamin', sources: 'Chou kale, épinards, brocoli' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', rda: 1000, group: 'mineral', sources: 'Produits laitiers, sardines, amandes, chou' },
  { key: 'magnesium', label: 'Magnésium', unit: 'mg', rda: 400, group: 'mineral', sources: 'Noix, graines, chocolat noir, légumineuses' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', rda: 3500, group: 'mineral', sources: 'Banane, pomme de terre, avocat, légumineuses' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', rda: 2300, group: 'mineral', isLimit: true, sources: 'Sel, produits transformés, fromages' },
  { key: 'iron', label: 'Fer', unit: 'mg', rda: 14, group: 'mineral', sources: 'Viande rouge, foie, lentilles, épinards' },
  { key: 'zinc', label: 'Zinc', unit: 'mg', rda: 11, group: 'mineral', sources: 'Huîtres, viande rouge, graines de courge' },
  { key: 'copper', label: 'Cuivre', unit: 'mg', rda: 0.9, group: 'mineral', sources: 'Foie, fruits de mer, noix de cajou' },
  { key: 'manganese', label: 'Manganèse', unit: 'mg', rda: 2.3, group: 'mineral', sources: 'Céréales complètes, noix, thé' },
  { key: 'selenium', label: 'Sélénium', unit: 'µg', rda: 55, group: 'mineral', sources: 'Noix du Brésil, poissons, œufs' },
  { key: 'iodine', label: 'Iode', unit: 'µg', rda: 150, group: 'mineral', sources: 'Poissons de mer, algues, produits laitiers' },
  { key: 'phosphorus', label: 'Phosphore', unit: 'mg', rda: 700, group: 'mineral', sources: 'Produits laitiers, viandes, poissons' },
];

export const NUTRIENT_BY_KEY: Record<string, NutrientMeta> = Object.fromEntries(
  NUTRIENTS.map((n) => [n.key, n]),
);

export const MICRO_KEYS: NutrientKey[] = NUTRIENTS.filter(
  (n) => n.group === 'vitamin' || n.group === 'mineral' || n.key === 'omega3' || n.key === 'fiber',
).map((n) => n.key);

export const MEALS: { id: MealId; label: string; icon: string; androidIcon: string }[] = [
  { id: 'breakfast', label: 'Petit-déjeuner', icon: 'sun.max.fill', androidIcon: 'sunny' },
  { id: 'lunch', label: 'Déjeuner', icon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'snack', label: 'Collation', icon: 'leaf.fill', androidIcon: 'leaf' },
  { id: 'dinner', label: 'Dîner', icon: 'moon.fill', androidIcon: 'moon' },
];

export function scaleNutrients(per100: Nutrients, grams: number): Nutrients {
  const out: Nutrients = {};
  (Object.keys(per100) as NutrientKey[]).forEach((k) => {
    const v = per100[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = (v * grams) / 100;
  });
  return out;
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const out: Nutrients = {};
  list.forEach((n) => {
    (Object.keys(n) as NutrientKey[]).forEach((k) => {
      const v = n[k];
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = (out[k] ?? 0) + v;
    });
  });
  return out;
}

export function totalsForEntries(entries: JournalEntry[]): Nutrients {
  return sumNutrients(entries.map((e) => scaleNutrients(e.per100, e.grams)));
}

export interface KnownNutrientTotal {
  amount?: number;
  knownEntries: number;
  totalEntries: number;
}

export function knownTotalForEntries(entries: JournalEntry[], key: NutrientKey): KnownNutrientTotal {
  let amount = 0;
  let knownEntries = 0;
  entries.forEach((entry) => {
    const value = entry.per100[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    amount += (value * entry.grams) / 100;
    knownEntries += 1;
  });
  return { amount: knownEntries ? amount : undefined, knownEntries, totalEntries: entries.length };
}

export function completeTotalForEntries(entries: JournalEntry[], key: NutrientKey): number | undefined {
  if (!entries.length || entries.some((entry) => typeof entry.per100[key] !== 'number' || !Number.isFinite(entry.per100[key]))) return undefined;
  return entries.reduce((sum, entry) => sum + ((entry.per100[key] as number) * entry.grams) / 100, 0);
}

export function scoreTotalsForEntries(entries: JournalEntry[]): Nutrients {
  const totals = totalsForEntries(entries);
  (['kcal', 'protein', 'carbs', 'fat'] as NutrientKey[]).forEach((key) => {
    const complete = completeTotalForEntries(entries, key);
    if (complete === undefined) delete totals[key];
    else totals[key] = complete;
  });
  return totals;
}

export interface MicronutrientStatus {
  key: NutrientKey;
  label: string;
  unit: NutrientMeta['unit'];
  target: number;
  amount?: number;
  percent?: number;
  available: boolean;
  complete: boolean;
  sources: string[];
}

export function micronutrientStatuses(entries: JournalEntry[], profile?: Pick<Profile, 'age' | 'sex'>): MicronutrientStatus[] {
  return MICRO_KEYS.map((key) => {
    const meta = NUTRIENT_BY_KEY[key];
    const target = nutrientTargetForProfile(key, profile) ?? meta.rda;
    const contributions = entries
      .map((entry) => {
        const per100 = entry.per100[key];
        if (typeof per100 !== 'number' || !Number.isFinite(per100)) return null;
        return { name: entry.foodName, amount: (per100 * entry.grams) / 100 };
      })
      .filter((item): item is { name: string; amount: number } => item !== null);

    if (contributions.length === 0) {
      return { key, label: meta.label, unit: meta.unit, target, available: false, complete: false, sources: [] };
    }

    const amount = contributions.reduce((sum, item) => sum + item.amount, 0);
    const sources = contributions
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((item) => item.name);
    return {
      key,
      label: meta.label,
      unit: meta.unit,
      target,
      amount,
      percent: pct(amount, target),
      available: true,
      complete: entries.length > 0 && contributions.length === entries.length,
      sources,
    };
  });
}

export function formatNutrientValue(value: number | undefined, unit: string): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'Donnée indisponible';
  const absolute = Math.abs(value);
  if (absolute === 0) return `0 ${unit}`.trim();
  if (absolute < 0.000001) return `${value.toExponential(2)} ${unit}`.trim();
  const decimals = absolute >= 100 ? 0 : absolute >= 10 ? 1 : absolute >= 1 ? 2 : absolute >= 0.1 ? 3 : absolute >= 0.01 ? 4 : 6;
  return `${Number(value.toFixed(decimals))} ${unit}`.trim();
}

export function fmtAmount(key: NutrientKey, value: number | undefined): string {
  const meta = NUTRIENT_BY_KEY[key];
  return formatNutrientValue(value, meta ? meta.unit : '');
}

export function pct(value: number | undefined, target: number): number {
  if (!target || value === undefined || !Number.isFinite(value)) return 0;
  const raw = Math.max(0, (value / target) * 100);
  return raw < 10 ? Math.round(raw * 10) / 10 : Math.round(raw);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(offsetDays = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return localDateKey(d);
}

export function dateLabel(dateKey: string): string {
  const today = todayKey();
  if (dateKey === today) return "Aujourd'hui";
  if (dateKey === todayKey(-1)) return 'Hier';
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function shiftDate(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}
