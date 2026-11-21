import React, { createContext, useContext } from 'react';
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
  /** Colour of the neon light (particles, glows). */
  neon: string;
}

export const NEON: Theme = {
  mode: 'dark',
  bg: '#050505', card: '#110B0CE0', cardAlt: '#1B1214', text: '#F7F1EF', sub: '#A99E9C',
  primary: '#FF3B4E', primarySoft: '#3A0D14',
  aqua: '#FF8A5B', aquaSoft: '#35180E',
  accent: '#FFC15A', accentSoft: '#33260E',
  border: '#2B1B1D', success: '#4ADE80', successSoft: '#0E2A19', warn: '#FFC15A', danger: '#FF6B6B',
  heroGradient: ['#140406', '#3A0A12', '#6A0F1C'], sunGradient: ['#FF3B4E', '#FF8A5B'],
  deep: '#FF7A86', deepSoft: '#2A0E12', onPrimary: '#140306', cardSolid: '#110B0C',
  outline: '#FF3B4E59', shadow: '#000000',
  primaryGradient: ['#FF6A79', '#FF2D44'],
  atmosphere: ['#080405', '#050505', '#0B0506'],
  sleepGradient: ['#12071A', '#2E1035'], waterGradient: ['#05171E', '#0E3440'], outdoorGradient: ['#2E0F05', '#6A280C'],
  chart: { micros: '#FF7AB6', water: '#5CC8E0', steps: '#FF8A5B', sleep: '#B99BFF' },
  neon: '#FF2D44',
};
/** Kept for compatibility with screens written for the two-theme app: both point to the neon theme. */
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

interface ThemeCtx { theme: Theme; mode: ThemeMode; themeReady: boolean; needsThemeChoice: boolean; setMode: (mode: ThemeMode) => void; completeThemeChoice: (mode: ThemeMode) => void; }
const noop = () => {};
const VALUE: ThemeCtx = { theme: NEON, mode: 'dark', themeReady: true, needsThemeChoice: false, setMode: noop, completeThemeChoice: noop };
const Ctx = createContext<ThemeCtx>(VALUE);
export function ThemeProvider({ children }: { children: React.ReactNode }) { return <Ctx.Provider value={VALUE}>{children}</Ctx.Provider>; }
export function useTheme() { return useContext(Ctx); }
