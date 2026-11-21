import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';
export interface Theme { mode: ThemeMode; bg: string; card: string; cardAlt: string; text: string; sub: string; primary: string; primarySoft: string; aqua: string; aquaSoft: string; accent: string; accentSoft: string; border: string; success: string; successSoft: string; warn: string; danger: string; heroGradient: [string, string, string]; sunGradient: [string, string]; }
export const LIGHT: Theme = { mode: 'light', bg: '#F5FAFF', card: '#FFFFFFD9', cardAlt: '#EEF7FDD9', text: '#183153', sub: '#627795', primary: '#2563EB', primarySoft: '#E1EEFF', aqua: '#22B8C9', aquaSoft: '#E1F8F8', accent: '#F59E0B', accentSoft: '#FFF3D9', border: '#DDEBF7CC', success: '#20A97A', successSoft: '#DCF6EA', warn: '#F59E0B', danger: '#E8604C', heroGradient: ['#1D4ED8', '#248BD8', '#38BDF8'], sunGradient: ['#F59E0B', '#FBCB52'] };
export const DARK: Theme = { mode: 'dark', bg: '#08192D', card: '#10243CE8', cardAlt: '#132B45CC', text: '#EDF7FF', sub: '#9BB4CC', primary: '#62A3FF', primarySoft: '#18375A', aqua: '#51D0D6', aquaSoft: '#123C48', accent: '#FFD05B', accentSoft: '#423512', border: '#1D3956CC', success: '#48D9A2', successSoft: '#123C31', warn: '#FFD05B', danger: '#F38A73', heroGradient: ['#174DBA', '#13779B', '#176D9B'], sunGradient: ['#D98A12', '#FFC04A'] };
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
