import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { I18nText as Text } from './I18nText';
import { RADIUS, shadow, useTheme } from '../lib/theme';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { Pressable3D } from './motion';

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  const { theme } = useTheme();
  const base: ViewStyle = { backgroundColor: theme.card, borderRadius: RADIUS.lg, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, ...shadow(theme, 1) };
  if (onPress) return <Pressable3D onPress={onPress} style={[base, style]}>{children}</Pressable3D>;
  return <View style={[base, style]}>{children}</View>;
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { theme } = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(100, value));
  useEffect(() => { Animated.timing(width, { toValue: clamped, duration: 620, useNativeDriver: false }).start(); }, [clamped, width]);
  const animatedWidth = width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return <View style={{ height, borderRadius: height / 2, backgroundColor: theme.cardAlt, overflow: 'hidden' }}>
    <Animated.View style={{ width: animatedWidth, height: '100%', borderRadius: height / 2, backgroundColor: color || theme.primary, overflow: 'hidden' }}>
      {/* top sheen gives the bar a subtle rounded, 3D feel */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height / 2, backgroundColor: '#FFFFFF', opacity: theme.mode === 'dark' ? 0.12 : 0.22 }} />
    </Animated.View>
  </View>;
}

export function SectionTitle({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return <View style={styles.sectionRow}><Text style={[styles.sectionTitle, FONTS.display.semibold, { color: theme.text }]}>{title}</Text>{actionLabel && onAction ? <Pressable3D onPress={onAction} style={[styles.actionPress, { borderColor: theme.outline }]}><Text style={[styles.action, FONTS.text.semibold, { color: theme.primary }]}>{actionLabel}</Text><Icon name="chevron.right" android="chevron-forward" size={14} color={theme.primary} /></Pressable3D> : null}</View>;
}

export function PrimaryButton({ label, onPress, disabled, color }: { label: string; onPress: () => void; disabled?: boolean; color?: string }) {
  const { theme } = useTheme();
  const textColor = disabled ? theme.sub : color ? '#FFFFFF' : theme.onPrimary;
  return <Pressable3D onPress={onPress} disabled={disabled} tilt={10} sink={0.97} style={[styles.button, disabled ? { backgroundColor: theme.cardAlt } : { backgroundColor: color || theme.primary, ...shadow(theme, 2, color || theme.primary) }]}>
    {!disabled ? <LinearGradient colors={color ? [color, color] : theme.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.pill }]} /> : null}
    {!disabled ? <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }} style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.pill }]} /> : null}
    <Text style={[styles.buttonLabel, FONTS.text.semibold, { color: textColor }]}>{label}</Text>
  </Pressable3D>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  return <Pressable3D onPress={onPress} tilt={0} sink={0.95} style={[styles.chip, selected ? { backgroundColor: theme.primary, borderColor: theme.primary, ...shadow(theme, 1, theme.primary) } : { backgroundColor: theme.card, borderColor: theme.outline }]}><Text style={[FONTS.text.semibold, { fontSize: 14, color: selected ? theme.onPrimary : theme.text }]}>{label}</Text></Pressable3D>;
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 14 },
  sectionTitle: { fontSize: 21, letterSpacing: -0.3 }, actionPress: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1 }, action: { fontSize: 13 },
  button: { borderRadius: RADIUS.pill, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  buttonLabel: { fontSize: 16, letterSpacing: 0.2 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1.5 },
});
