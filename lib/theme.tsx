import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ViewStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMAL design system — « Terre & braise »
// Every colour, radius, spacing, shadow and motion value used by the app lives
// here, so the whole UI can be re-tuned from one file.
// The logic of the provider (persisted light/dark choice) is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';
export interface Theme {
  mode: ThemeMode;
  bg: string; card: string; cardAlt: string; text: string; sub: string;
  primary: string; primarySoft: string; aqua: string; aquaSoft: string; accent: string; accentSoft: string;
  border: string; success: string; successSoft: string; warn: string; danger: string;
  heroGradient: [string, string, string]; sunGradient: [string, string];
  /** Deep bordeaux, used for strong brand surfaces (hero arch, selected states). */
  deep: string; deepSoft: string;
  /** Text / icon colour to use on top of `primary`. */
  onPrimary: string;
  /** Opaque card colour (for elements that must not show the background through). */
  cardSolid: string;
  /** Outline used by pill buttons and chips (like the reference's « MENU » button). */
  outline: string;
  /** Tint used for shadows. */
  shadow: string;
  /** Gradient used for the raised 3D primary button / orb. */
  primaryGradient: [string, string];
  /** Background atmosphere gradient (top → bottom). */
  atmosphere: [string, string, string];
  /** Feature hero gradients (white text on top, contrast ≥ 4.5:1). */
  sleepGradient: [string, string]; waterGradient: [string, string]; outdoorGradient: [string, string];
  /** Series colours for charts (Stats screen). */
  chart: { micros: string; water: string; steps: string; sleep: string };
}

export const LIGHT: Theme = {
  mode: 'light',
  bg: '#F8F1E9', card: '#FFFCF8F2', cardAlt: '#F2E7DB', text: '#2A1A17', sub: '#6B574F',
  primary: '#B4461C', primarySoft: '#FAEAE0',
  aqua: '#4C7A5C', aquaSoft: '#E1ECE2',
  accent: '#94600C', accentSoft: '#F6E8CF',
  border: '#E6D6C6', success: '#4E7A2F', successSoft: '#E4EDD5', warn: '#94600C', danger: '#B3362A',
  heroGradient: ['#4E1A20', '#6B2A2E', '#93392C'], sunGradient: ['#C4501F', '#E0904A'],
  deep: '#6B2A2E', deepSoft: '#F2DFDB', onPrimary: '#FFFFFF', cardSolid: '#FFFCF8',
  outline: '#6B2A2E52', shadow: '#5A2E1E',
  primaryGradient: ['#C04E1E', '#A23A13'],
  atmosphere: ['#FBF6F0', '#F6EBDF', '#F9F0E6'],
  sleepGradient: ['#2E1B33', '#5A3550'], waterGradient: ['#1F4A50', '#3A7478'], outdoorGradient: ['#8E4413', '#B0621E'],
  chart: { micros: '#8E4F72', water: '#2F6E75', steps: '#4C7A5C', sleep: '#5E4475' },
};

export const DARK: Theme = {
  mode: 'dark',
  bg: '#17100E', card: '#241A17F0', cardAlt: '#31251F', text: '#F6ECE4', sub: '#C2ADA2',
  primary: '#EC8A5E', primarySoft: '#46261B',
  aqua: '#8FBC9C', aquaSoft: '#1E3327',
  accent: '#E8B45F', accentSoft: '#3E2F16',
  border: '#3B2D27', success: '#A6C77B', successSoft: '#26331B', warn: '#E8B45F', danger: '#F28B76',
  heroGradient: ['#33100F', '#561E22', '#7A2E2A'], sunGradient: ['#C4501F', '#E8945C'],
  deep: '#E3A497', deepSoft: '#3D1F21', onPrimary: '#1E0E08', cardSolid: '#241A17',
  outline: '#E3A49766', shadow: '#000000',
  primaryGradient: ['#F29D74', '#DB7246'],
  atmosphere: ['#1A1210', '#140E0C', '#1C1411'],
  sleepGradient: ['#24142A', '#4A2B44'], waterGradient: ['#173A3F', '#2E5F63'], outdoorGradient: ['#7A3A10', '#9C5419'],
  chart: { micros: '#D49BBE', water: '#7CC3C9', steps: '#8FBC9C', sleep: '#B9A0D6' },
};

/** Spacing scale (4-pt grid). */
export const SPACE = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;

/** Corner radii: soft, generous rounding as in the reference. */
export const RADIUS = { sm: 12, md: 18, lg: 26, xl: 34, arch: 96, pill: 999 } as const;

/** Type scale — body text never goes below 12 pt for readability. */
export const TYPE = { caption: 12, body: 14, bodyLg: 16, title: 21, h1: 30, hero: 34, eyebrow: 11 } as const;

/** Motion: calm, moderate animations. */
export const MOTION = { fast: 180, base: 320, slow: 520, stagger: 70, float: 4200, ambient: 30000, spring: { speed: 22, bounciness: 7 } } as const;

/** Elevation levels: soft, warm, layered shadows that give the « 3D » depth. */
export function shadow(theme: Theme, level: 1 | 2 | 3 = 1, tint?: string): ViewStyle {
  const dark = theme.mode === 'dark';
  const presets = {
    1: { shadowOpacity: dark ? 0.32 : 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
    2: { shadowOpacity: dark ? 0.42 : 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
    3: { shadowOpacity: dark ? 0.5 : 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  } as const;
  return { shadowColor: tint || theme.shadow, ...presets[level] };
}

interface ThemeCtx { theme: Theme; mode: ThemeMode; themeReady: boolean; needsThemeChoice: boolean; setMode: (mode: ThemeMode) => void; completeThemeChoice: (mode: ThemeMode) => void; }
const Ctx = createContext<ThemeCtx>({ theme: LIGHT, mode: 'light', themeReady: false, needsThemeChoice: false, setMode: () => {}, completeThemeChoice: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light'); const [themeReady, setThemeReady] = useState(false); const [needsThemeChoice, setNeedsThemeChoice] = useState(false);
  useEffect(() => { AsyncStorage.getItem('primal.themeMode').then((value) => { if (value === 'dark' || value === 'light') { setModeState(value); setNeedsThemeChoice(false); } else { setModeState('light'); setNeedsThemeChoice(true); } }).catch(() => setNeedsThemeChoice(true)).finally(() => setThemeReady(true)); }, []);
  const setMode = (next: ThemeMode) => { setModeState(next); setNeedsThemeChoice(false); AsyncStorage.setItem('primal.themeMode', next).catch(() => {}); };
  const completeThemeChoice = (next: ThemeMode) => setMode(next);
  return <Ctx.Provider value={{ theme: mode === 'dark' ? DARK : LIGHT, mode, themeReady, needsThemeChoice, setMode, completeThemeChoice }}>{children}</Ctx.Provider>;
}
export function useTheme() { return useContext(Ctx); }
