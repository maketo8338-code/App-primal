import React from 'react';
import { Pressable, StyleSheet, Text as NativeText, View, ViewStyle } from 'react-native';
import { I18nText as Text } from './I18nText';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';

export function ProgressRing({ value, size = 116, stroke = 10, color, trackColor, children }: { value: number; size?: number; stroke?: number; color?: string; trackColor?: string; children?: React.ReactNode }) {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = `${(circumference * clamped) / 100} ${circumference}`;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor || theme.cardAlt} strokeWidth={stroke} fill={theme.cardAlt} />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color || theme.primary} strokeWidth={stroke} fill={theme.cardAlt} strokeDasharray={dash} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
    </Svg>
    {children}
  </View>;
}

export function IconBadge({ name, android, color, backgroundColor, size = 36 }: { name: string; android: string; color: string; backgroundColor: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor }}><Icon name={name as any} android={android as any} size={Math.round(size * 0.48)} color={color} /></View>;
}

export function Surface({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  const { theme } = useTheme();
  const surface = [styles.surface, { backgroundColor: theme.card, borderColor: theme.border }, style];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [surface, pressed && styles.pressed]}>{children}</Pressable>;
  return <View style={surface}>{children}</View>;
}

export function SectionHeading({ title, eyebrow, action, onAction }: { title: string; eyebrow?: string; action?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return <View style={styles.headingRow}>
    <View style={{ flex: 1 }}>
      {eyebrow ? <Text style={[FONTS.text.semibold, styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text> : null}
      <Text style={[FONTS.display.semibold, styles.heading, { color: theme.text }]}>{title}</Text>
    </View>
    {action && onAction ? <Pressable onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Text style={[FONTS.text.semibold, { color: theme.primary, fontSize: 13 }]}>{action}</Text><Icon name="chevron.right" android="chevron-forward" size={14} color={theme.primary} /></Pressable> : null}
  </View>;
}

export function CompactStat({ label, value, unit, icon, android, color, soft, onPress }: { label: string; value: string; unit?: string; icon: string; android: string; color: string; soft: string; onPress?: () => void }) {
  const { theme } = useTheme();
  return <Surface onPress={onPress} style={styles.compactStat}><View style={styles.compactTop}><IconBadge name={icon} android={android} color={color} backgroundColor={soft} size={34} /><Icon name="chevron.right" android="chevron-forward" size={14} color={theme.sub} /></View><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 12, marginTop: 12 }]}>{label}</Text><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 14, marginTop: 3 }]} numberOfLines={1} ellipsizeMode="tail">{value}{unit ? <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11 }]}> {unit}</Text> : null}</Text></Surface>;
}

const styles = StyleSheet.create({
  surface: { borderRadius: 24, borderWidth: 1, padding: 16, shadowColor: '#174A7C', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  headingRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 },
  heading: { fontSize: 21, letterSpacing: -0.45, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingLeft: 8 },
  compactStat: { width: '48%', minHeight: 136 },
  compactTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
