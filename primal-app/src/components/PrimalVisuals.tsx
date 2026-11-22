import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { I18nText as Text } from './I18nText';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { RADIUS, shadow, useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { Icon } from '../components/Icon';
import { Pressable3D } from './motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
let ringIds = 0;

/**
 * Circular progress. The arc sweeps to its value with an eased animation and is
 * drawn with a soft gradient for depth. Same props as before, plus an optional
 * `fill` for the inner disc.
 */
export function ProgressRing({ value, size = 116, stroke = 10, color, trackColor, fill, children }: { value: number; size?: number; stroke?: number; color?: string; trackColor?: string; fill?: string; children?: React.ReactNode }) {
  const { theme } = useTheme();
  const id = useRef(`ring${++ringIds}`).current;
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(progress, { toValue: clamped, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [clamped, progress]);
  const dashOffset = progress.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] });
  const arc = color || theme.primary;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {(theme.metal && !color ? theme.metal : [arc, arc]).map((c, i, all) => <Stop key={i} offset={String(i / (all.length - 1))} stopColor={c} stopOpacity={theme.metal && !color ? '1' : i === 0 ? '0.72' : '1'} />)}
        </SvgLinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor || theme.cardAlt} strokeOpacity={trackColor ? 0.22 : 1} strokeWidth={stroke} fill={fill ?? theme.cardAlt} />
      {clamped > 0 ? <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={dashOffset as unknown as number} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} /> : null}
    </Svg>
    {children}
  </View>;
}

/** Icon in a raised, glossy tile (soft 3D look). */
export function IconBadge({ name, android, color, backgroundColor, size = 36 }: { name: string; android: string; color: string; backgroundColor: string; size?: number }) {
  const { theme } = useTheme();
  const dark = theme.mode === 'dark';
  const r = Math.round(size * 0.34);
  return <View style={{ width: size, height: size, borderRadius: r, backgroundColor, ...shadow(theme, 1, color), shadowOpacity: dark ? 0.35 : 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}>
    <View style={{ flex: 1, borderRadius: r, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={dark ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.18)'] : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)', 'rgba(90,46,30,0.07)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Icon name={name as any} android={android as any} size={Math.round(size * 0.48)} color={color} />
    </View>
  </View>;
}

export function Surface({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  const { theme } = useTheme();
  const surface = [styles.surface, { backgroundColor: theme.card, borderColor: theme.border }, shadow(theme, 1), style];
  if (onPress) return <Pressable3D onPress={onPress} style={surface}>{children}</Pressable3D>;
  return <View style={surface}>{children}</View>;
}

export function SectionHeading({ title, eyebrow, action, onAction }: { title: string; eyebrow?: string; action?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return <View style={styles.headingRow}>
    <View style={{ flex: 1 }}>
      {eyebrow ? <Text style={[FONTS.text.bold, styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text> : null}
      <Text style={[FONTS.display.semibold, styles.heading, { color: theme.text }]}>{title}</Text>
    </View>
    {action && onAction ? <Pressable3D onPress={onAction} tilt={0} sink={0.95} style={[styles.action, { borderColor: theme.outline }]}><Text style={[FONTS.text.semibold, { color: theme.primary, fontSize: 13 }]}>{action}</Text><Icon name="chevron.right" android="chevron-forward" size={14} color={theme.primary} /></Pressable3D> : null}
  </View>;
}

export function CompactStat({ label, value, unit, icon, android, color, soft, onPress }: { label: string; value: string; unit?: string; icon: string; android: string; color: string; soft: string; onPress?: () => void }) {
  const { theme } = useTheme();
  return <Surface onPress={onPress} style={styles.compactStat}><View style={styles.compactTop}><IconBadge name={icon} android={android} color={color} backgroundColor={soft} size={38} /><View style={[styles.chevron, { backgroundColor: theme.cardAlt }]}><Icon name="chevron.right" android="chevron-forward" size={12} color={theme.sub} /></View></View><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 12, marginTop: 14 }]}>{label}</Text><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 14, marginTop: 4 }]} numberOfLines={1} ellipsizeMode="tail">{value}{unit ? <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12 }]}> {unit}</Text> : null}</Text></Surface>;
}

const styles = StyleSheet.create({
  surface: { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  headingRow: { minHeight: 36, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  heading: { fontSize: 23, letterSpacing: -0.3, marginTop: 3 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1, marginLeft: 8 },
  compactStat: { width: '48%', minHeight: 140 },
  compactTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chevron: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
