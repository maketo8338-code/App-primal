import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text as NativeText, View, ViewStyle } from 'react-native';
import { I18nText as Text } from './I18nText';
import { useTheme } from '../lib/theme';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  const { theme } = useTheme();
  const base: ViewStyle = { backgroundColor: theme.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: theme.border, shadowColor: '#174A7C', shadowOpacity: theme.mode === 'light' ? 0.055 : 0, shadowRadius: 24, shadowOffset: { width: 0, height: 7 }, elevation: 2 };
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && styles.pressed]}>{children}</Pressable>;
  return <View style={[base, style]}>{children}</View>;
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { theme } = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(100, value));
  useEffect(() => { Animated.timing(width, { toValue: clamped, duration: 420, useNativeDriver: false }).start(); }, [clamped, width]);
  const animatedWidth = width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return <View style={{ height, borderRadius: height / 2, backgroundColor: theme.cardAlt, overflow: 'hidden' }}><Animated.View style={{ width: animatedWidth, height: '100%', borderRadius: height / 2, backgroundColor: color || theme.primary }} /></View>;
}

export function SectionTitle({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return <View style={styles.sectionRow}><Text style={[styles.sectionTitle, FONTS.display.semibold, { color: theme.text }]}>{title}</Text>{actionLabel && onAction ? <Pressable onPress={onAction} style={({ pressed }) => [styles.actionPress, pressed && styles.pressed]}><Text style={[styles.action, FONTS.text.semibold, { color: theme.primary }]}>{actionLabel}</Text><Icon name="chevron.right" android="chevron-forward" size={14} color={theme.primary} /></Pressable> : null}</View>;
}

export function PrimaryButton({ label, onPress, disabled, color }: { label: string; onPress: () => void; disabled?: boolean; color?: string }) {
  const { theme } = useTheme();
  return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, { backgroundColor: disabled ? theme.cardAlt : color || theme.primary, shadowColor: color || theme.primary }, pressed && !disabled && styles.buttonPressed]}><Text style={[styles.buttonLabel, FONTS.text.semibold, { color: disabled ? theme.sub : '#FFFFFF' }]}>{label}</Text></Pressable>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, { backgroundColor: selected ? theme.primary : theme.card, borderColor: selected ? theme.primary : theme.border }, pressed && styles.pressed]}><Text style={[FONTS.text.semibold, { fontSize: 14, color: selected ? '#FFFFFF' : theme.text }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 12 },
  sectionTitle: { fontSize: 20, letterSpacing: -0.45 }, actionPress: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 }, action: { fontSize: 14 },
  button: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, buttonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] }, buttonLabel: { fontSize: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
});
