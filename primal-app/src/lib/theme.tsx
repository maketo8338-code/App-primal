import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ViewStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMAL design system — « Néon braise »
// One dark theme only: deep black, neon-red light, ember accents.
// Every colour, radius, spacing, shadow and motion value lives here.
// Token names are shared with the previous app so screens stay portable.
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';
export interface Theme {
  mode: ThemeMode;
  bg: string; card: string; cardAlt: string; text: string; sub: string;
  primary: string; primarySoft: string; aqua: string; aquaSoft: string; accent: string; accentSoft: string;
  border: string; success: string; successSoft: string; warn: string; danger: string;
  heroGradient: [string, string, string]; sunGradient: [string, string];
  deep: string; deepSoft: string; onPrimary: string; cardSolid: string; outline: string; shadow: string;
  primaryGradient: [string, string]; atmosphere: [string, string, string];
  sleepGradient: [string, string]; waterGradient: [string, string]; outdoorGradient: [string, string];
  chart: { micros: string; water: string; steps: string; sleep: string };
  /** Colour of the neon light (glows). */
  neon: string;
  /** Particle light colours. */
  light: NeonLight;
  /** « Métal » themes: brushed-metal gradient stops (buttons, rings, edges). Undefined elsewhere. */
  metal?: string[];
}

/** Particle light colours, as [r, g, b]. */
export interface NeonLight { halo: [number, number, number]; edge: [number, number, number]; core: [number, number, number]; haze: [number, number, number] }

export type ClassicId = 'braise' | 'ambre' | 'foret' | 'glacier' | 'lune';
/** « Galaxie » variants: each one is unlocked with its own promo code. */
export type GalaxyId = 'nebuleuse' | 'aurore' | 'supernova' | 'trounoir';
/** « Métal » variants (future premium themes), also unlocked with a code. */
export type MetalId = 'or' | 'chrome';
/** Every variant that sits behind a padlock. */
export type LockedId = GalaxyId | MetalId;
export type AccentId = ClassicId | LockedId;
export const CLASSIC_IDS: ClassicId[] = ['braise', 'ambre', 'foret', 'glacier', 'lune'];
export const GALAXY_IDS: GalaxyId[] = ['nebuleuse', 'aurore', 'supernova', 'trounoir'];
export function isGalaxy(id: AccentId): id is GalaxyId { return (GALAXY_IDS as string[]).includes(id); }
export const METAL_IDS: MetalId[] = ['or', 'chrome'];
export const LOCKED_IDS: LockedId[] = [...GALAXY_IDS, ...METAL_IDS];
export function isLocked(id: AccentId): id is LockedId { return (LOCKED_IDS as string[]).includes(id); }
/** Variants with their own animated background (Galaxie + Métal). */
export function hasSky(id: AccentId): id is LockedId { return isLocked(id); }
interface Palette {
  label: string;
  primary: string; primarySoft: string; primaryGradient: [string, string]; deep: string; deepSoft: string; onPrimary: string; neon: string;
  heroGradient: [string, string, string]; card: string; cardAlt: string; cardSolid: string; border: string; atmosphere: [string, string, string];
  light: NeonLight;
  /** Galaxy variants: two signature colours for the swatch and the sky. */
  galaxy?: { a: [number, number, number]; b: [number, number, number]; c: [number, number, number] };
  metal?: string[];
}

/** The ambiences the user can pick in Settings › Ambiance (5 classic + 4 Galaxie). */
export const PALETTES: Record<AccentId, Palette> = {
  braise: { label: 'Braise', primary: '#FF3B4E', primarySoft: '#3A0D14', primaryGradient: ['#FF6A79', '#FF2D44'], deep: '#FF7A86', deepSoft: '#2A0E12', onPrimary: '#140306', neon: '#FF2D44',
    heroGradient: ['#140406', '#3A0A12', '#6A0F1C'], card: '#110B0CE0', cardAlt: '#1B1214', cardSolid: '#110B0C', border: '#2B1B1D', atmosphere: ['#080405', '#050505', '#0B0506'],
    light: { halo: [255, 45, 68], edge: [255, 26, 52], core: [255, 154, 122], haze: [90, 10, 20] } },
  ambre: { label: 'Ambre', primary: '#FFB13B', primarySoft: '#3A2708', primaryGradient: ['#FFC766', '#FF9F1C'], deep: '#FFC98A', deepSoft: '#2B1D0A', onPrimary: '#1A0F02', neon: '#FF9F1C',
    heroGradient: ['#140C03', '#3A2108', '#6A3A0C'], card: '#120E09E0', cardAlt: '#1C160F', cardSolid: '#120E09', border: '#2C2216', atmosphere: ['#080604', '#050505', '#0B0805'],
    light: { halo: [255, 159, 28], edge: [255, 120, 20], core: [255, 214, 150], haze: [90, 50, 10] } },
  foret: { label: 'Forêt', primary: '#3DF2A4', primarySoft: '#0B3324', primaryGradient: ['#7AF7C2', '#22E092'], deep: '#8AF5C9', deepSoft: '#0D2A20', onPrimary: '#03170F', neon: '#22E092',
    heroGradient: ['#03120C', '#0A3122', '#0F5A3C'], card: '#0A100DE0', cardAlt: '#111A16', cardSolid: '#0A100D', border: '#18291F', atmosphere: ['#040805', '#050505', '#050B08'],
    light: { halo: [34, 224, 146], edge: [20, 190, 120], core: [190, 255, 225], haze: [10, 80, 50] } },
  glacier: { label: 'Glacier', primary: '#4FC3FF', primarySoft: '#0B2A3D', primaryGradient: ['#86D8FF', '#2EAEFF'], deep: '#9ADBFF', deepSoft: '#0C2131', onPrimary: '#021220', neon: '#2EAEFF',
    heroGradient: ['#030C14', '#0A2236', '#0E3D5E'], card: '#090D12E0', cardAlt: '#10161D', cardSolid: '#090D12', border: '#18232E', atmosphere: ['#040608', '#050505', '#05080B'],
    light: { halo: [46, 174, 255], edge: [30, 130, 230], core: [200, 236, 255], haze: [10, 40, 90] } },
  lune: { label: 'Lune', primary: '#F2F2F2', primarySoft: '#262626', primaryGradient: ['#FFFFFF', '#D6D6D6'], deep: '#FFFFFF', deepSoft: '#1E1E1E', onPrimary: '#0A0A0A', neon: '#E8E8E8',
    heroGradient: ['#0A0A0A', '#1E1E1E', '#353535'], card: '#0E0E0EE0', cardAlt: '#171717', cardSolid: '#0E0E0E', border: '#262626', atmosphere: ['#070707', '#050505', '#090909'],
    light: { halo: [232, 232, 240], edge: [190, 190, 210], core: [255, 255, 255], haze: [60, 60, 70] } },
  // ── Galaxie (locked behind promo codes) ──
  nebuleuse: { label: 'Nébuleuse', primary: '#C77DFF', primarySoft: '#2A1240', primaryGradient: ['#E0A8FF', '#B24DFF'], deep: '#E3B8FF', deepSoft: '#1E0E2E', onPrimary: '#14051F', neon: '#B24DFF',
    heroGradient: ['#0C0518', '#2A0F45', '#5A1A6E'], card: '#0E0A16E0', cardAlt: '#17111F', cardSolid: '#0E0A16', border: '#2A1D38', atmosphere: ['#06040B', '#040308', '#0A050D'],
    light: { halo: [190, 110, 255], edge: [255, 80, 200], core: [240, 220, 255], haze: [70, 20, 90] },
    galaxy: { a: [150, 60, 255], b: [255, 70, 190], c: [90, 140, 255] } },
  aurore: { label: 'Aurore', primary: '#3DF5D0', primarySoft: '#0A2E33', primaryGradient: ['#7DFBE2', '#22D6C0'], deep: '#9CFCE8', deepSoft: '#0B2226', onPrimary: '#02151A', neon: '#22E0C8',
    heroGradient: ['#030A16', '#06243A', '#0A4A4E'], card: '#080D14E0', cardAlt: '#0F1720', cardSolid: '#080D14', border: '#16252F', atmosphere: ['#030610', '#03050A', '#040A0D'],
    light: { halo: [60, 240, 200], edge: [40, 180, 255], core: [210, 255, 245], haze: [10, 60, 80] },
    galaxy: { a: [40, 230, 170], b: [60, 140, 255], c: [170, 90, 255] } },
  supernova: { label: 'Supernova', primary: '#FFB547', primarySoft: '#3A2008', primaryGradient: ['#FFD27A', '#FF8A1F'], deep: '#FFD9A0', deepSoft: '#2B1708', onPrimary: '#1A0B02', neon: '#FF8A1F',
    heroGradient: ['#120602', '#3A1404', '#7A2E06'], card: '#120C08E0', cardAlt: '#1C140E', cardSolid: '#120C08', border: '#2E2014', atmosphere: ['#0A0503', '#060404', '#0C0604'],
    light: { halo: [255, 160, 50], edge: [255, 90, 30], core: [255, 240, 200], haze: [100, 40, 10] },
    galaxy: { a: [255, 170, 40], b: [255, 70, 30], c: [255, 230, 160] } },
  trounoir: { label: 'Trou noir', primary: '#CFE3FF', primarySoft: '#1A2230', primaryGradient: ['#FFFFFF', '#A9C8FF'], deep: '#E6F0FF', deepSoft: '#121821', onPrimary: '#05070B', neon: '#B8D4FF',
    heroGradient: ['#020203', '#0C1018', '#1C2636'], card: '#08090CE0', cardAlt: '#101218', cardSolid: '#08090C', border: '#1E2330', atmosphere: ['#020203', '#010102', '#030305'],
    light: { halo: [190, 215, 255], edge: [140, 170, 255], core: [255, 255, 255], haze: [30, 40, 60] },
    galaxy: { a: [200, 225, 255], b: [255, 190, 120], c: [120, 150, 255] } },
  // ── Métal (locked behind promo codes, premium later) ──
  // galaxy colours here = liquid-metal shades: a = body, b = deep shadow, c = highlight.
  or: { label: 'Or', primary: '#E9BE62', primarySoft: '#33260C', primaryGradient: ['#FFE29A', '#C9922E'], deep: '#F5D58C', deepSoft: '#241A08', onPrimary: '#1A1103', neon: '#E0A940',
    heroGradient: ['#0E0A04', '#2E2008', '#5C3F0E'], card: '#0F0C07E0', cardAlt: '#19140C', cardSolid: '#0F0C07', border: '#30261A', atmosphere: ['#080603', '#050404', '#0A0704'],
    light: { halo: [233, 180, 80], edge: [190, 130, 40], core: [255, 240, 200], haze: [90, 60, 15] },
    galaxy: { a: [214, 160, 62], b: [120, 76, 18], c: [255, 236, 176] },
    metal: ['#7A5414', '#E9C46F', '#FFF1C4', '#C9922E', '#8A6018', '#E8BD5E'] },
  chrome: { label: 'Chrome', primary: '#D9DEE6', primarySoft: '#23262B', primaryGradient: ['#FFFFFF', '#9DA4AF'], deep: '#EEF1F5', deepSoft: '#17191C', onPrimary: '#0A0B0D', neon: '#C9CFD8',
    heroGradient: ['#08090A', '#1C1F23', '#3A3F46'], card: '#0B0C0EE0', cardAlt: '#141619', cardSolid: '#0B0C0E', border: '#272A30', atmosphere: ['#060607', '#040405', '#07080A'],
    light: { halo: [200, 206, 216], edge: [140, 146, 158], core: [255, 255, 255], haze: [50, 54, 62] },
    galaxy: { a: [168, 174, 186], b: [58, 62, 70], c: [244, 247, 252] },
    metal: ['#555B65', '#C9CED6', '#FFFFFF', '#9AA1AC', '#5E6470', '#DDE1E8'] },
};

/** Builds the full theme for an accent: shared black base + the chosen palette. */
export function makeTheme(accent: AccentId): Theme {
  const p = PALETTES[accent] ?? PALETTES.braise;
  return {
    mode: 'dark',
    bg: '#050505', card: p.card, cardAlt: p.cardAlt, text: '#F7F1EF', sub: '#A99E9C',
    primary: p.primary, primarySoft: p.primarySoft,
    aqua: '#FF8A5B', aquaSoft: '#35180E',
    accent: '#FFC15A', accentSoft: '#33260E',
    border: p.border, success: '#4ADE80', successSoft: '#0E2A19', warn: '#FFC15A', danger: '#FF6B6B',
    heroGradient: p.heroGradient, sunGradient: [p.primary, '#FF8A5B'],
    deep: p.deep, deepSoft: p.deepSoft, onPrimary: p.onPrimary, cardSolid: p.cardSolid,
    outline: `${p.primary}59`, shadow: '#000000',
    primaryGradient: p.primaryGradient,
    atmosphere: p.atmosphere,
    sleepGradient: ['#12071A', '#2E1035'], waterGradient: ['#05171E', '#0E3440'], outdoorGradient: ['#2E0F05', '#6A280C'],
    chart: { micros: '#FF7AB6', water: '#5CC8E0', steps: '#FF8A5B', sleep: '#B99BFF' },
    neon: p.neon,
    light: p.light,
    metal: p.metal,
  };
}

export const NEON: Theme = makeTheme('braise');
/** Kept for compatibility with screens written for the two-theme app. */
export const DARK = NEON;
export const LIGHT = NEON;

export const SPACE = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 12, md: 18, lg: 24, xl: 32, arch: 96, pill: 999 } as const;
export const TYPE = { caption: 12, body: 14, bodyLg: 16, title: 21, h1: 30, hero: 34, eyebrow: 11 } as const;
export const MOTION = { fast: 180, base: 320, slow: 520, stagger: 70, float: 4200, ambient: 30000, spring: { speed: 22, bounciness: 7 } } as const;

/** Depth shadows (black). */
export function shadow(theme: Theme, level: 1 | 2 | 3 = 1, tint?: string): ViewStyle {
  const presets = {
    1: { shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
    2: { shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
    3: { shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  } as const;
  const preset = presets[level];
  // A coloured tint becomes a soft neon glow rather than a dark drop shadow.
  if (tint && tint !== theme.shadow) return { shadowColor: tint, shadowOpacity: level === 1 ? 0.35 : 0.55, shadowRadius: preset.shadowRadius, shadowOffset: { width: 0, height: level * 3 }, elevation: preset.elevation };
  return { shadowColor: theme.shadow, ...preset };
}

/** Neon halo around an element. */
export function glow(color: string, intensity = 1): ViewStyle {
  return { shadowColor: color, shadowOpacity: 0.65 * intensity, shadowRadius: 18 * intensity, shadowOffset: { width: 0, height: 0 }, elevation: Math.round(8 * intensity) };
}

// ── Ambience: particles on/off, intensity, accent colour (saved on the phone) ──
export type AmbienceIntensity = 'soft' | 'normal' | 'intense';
export interface Ambience { enabled: boolean; intensity: AmbienceIntensity; accent: AccentId; /** Galaxy variants unlocked with a code. */ unlocked: LockedId[]; /** Short sound during the launch animation. */ introSound: boolean; /** Light haptics during the launch animation. */ introHaptics: boolean }
export const DEFAULT_AMBIENCE: Ambience = { enabled: true, intensity: 'normal', accent: 'braise', unlocked: [], introSound: true, introHaptics: true };
export const INTENSITY_FACTOR: Record<AmbienceIntensity, number> = { soft: 0.45, normal: 1, intense: 1.6 };
const AMBIENCE_KEY = 'primal.ambience.v1';

function readAmbience(raw: string | null): Ambience {
  if (!raw) return DEFAULT_AMBIENCE;
  try { return sanitizeAmbience(JSON.parse(raw)); } catch { return DEFAULT_AMBIENCE; }
}

/** Keeps only valid ambience values (used for saved settings and imported backups). */
export function sanitizeAmbience(input: unknown): Ambience {
  const v = (input && typeof input === 'object' ? input : {}) as Partial<Ambience>;
  const unlocked = Array.isArray(v.unlocked) ? LOCKED_IDS.filter((id) => (v.unlocked as unknown[]).includes(id)) : [];
  {
    return {
      enabled: typeof v.enabled === 'boolean' ? v.enabled : DEFAULT_AMBIENCE.enabled,
      intensity: v.intensity === 'soft' || v.intensity === 'normal' || v.intensity === 'intense' ? v.intensity : DEFAULT_AMBIENCE.intensity,
      // A Galaxy variant can only be the active one if it was unlocked.
      accent: typeof v.accent === 'string' && Object.prototype.hasOwnProperty.call(PALETTES, v.accent) && (!isLocked(v.accent as AccentId) || unlocked.includes(v.accent as LockedId)) ? v.accent : DEFAULT_AMBIENCE.accent,
      unlocked,
      introSound: typeof v.introSound === 'boolean' ? v.introSound : DEFAULT_AMBIENCE.introSound,
      introHaptics: typeof v.introHaptics === 'boolean' ? v.introHaptics : DEFAULT_AMBIENCE.introHaptics,
    };
  }
}

interface ThemeCtx { theme: Theme; mode: ThemeMode; themeReady: boolean; needsThemeChoice: boolean; setMode: (mode: ThemeMode) => void; completeThemeChoice: (mode: ThemeMode) => void; ambience: Ambience; setAmbience: (patch: Partial<Ambience>) => void; }
const noop = () => {};
const Ctx = createContext<ThemeCtx>({ theme: NEON, mode: 'dark', themeReady: true, needsThemeChoice: false, setMode: noop, completeThemeChoice: noop, ambience: DEFAULT_AMBIENCE, setAmbience: noop });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ambience, setState] = useState<Ambience>(DEFAULT_AMBIENCE);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(AMBIENCE_KEY).then((raw) => setState(readAmbience(raw))).catch(() => undefined).finally(() => setReady(true));
  }, []);
  const setAmbience = useCallback((patch: Partial<Ambience>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      AsyncStorage.setItem(AMBIENCE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);
  const theme = useMemo(() => makeTheme(ambience.accent), [ambience.accent]);
  const value = useMemo<ThemeCtx>(() => ({ theme, mode: 'dark', themeReady: ready, needsThemeChoice: false, setMode: noop, completeThemeChoice: noop, ambience, setAmbience }), [theme, ready, ambience, setAmbience]);
  // Wait for the saved ambience (a few ms) so the app never flashes the wrong colour.
  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useTheme() { return useContext(Ctx); }
