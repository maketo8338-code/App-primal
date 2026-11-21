import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { I18nText as Text } from '../components/I18nText';
import { Pressable3D } from '../components/motion';
import { Icon } from '../components/Icon';
import { PrimaryButton } from '../components/ui';
import { GALAXY_IDS, glow, PALETTES, useTheme, type GalaxyId } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { useI18n } from '../lib/i18n';
import { variantForCode } from './codes';

const SIZE = 44;
const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;

/** Round « mini galaxy » swatch: two-colour glow + a few stars. Dimmed with a padlock while locked. */
function GalaxySwatch({ id, locked, selected }: { id: GalaxyId; locked: boolean; selected: boolean }) {
  const { theme } = useTheme();
  const g = PALETTES[id].galaxy!;
  return <View style={[styles.swatch, { borderColor: selected ? theme.text : locked ? theme.border : 'transparent' }, selected ? glow(PALETTES[id].neon, 0.9) : null]}>
    <Svg width={SIZE} height={SIZE} style={{ opacity: locked ? 0.35 : 1 }}>
      <Defs>
        <RadialGradient id={`gx-${id}`} cx="40%" cy="38%" r="70%">
          <Stop offset="0" stopColor={rgb(g.c)} stopOpacity="1" />
          <Stop offset="0.35" stopColor={rgb(g.a)} stopOpacity="0.95" />
          <Stop offset="0.75" stopColor={rgb(g.b)} stopOpacity="0.6" />
          <Stop offset="1" stopColor="#050505" stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill={`url(#gx-${id})`} />
      {[[12, 14, 1.2], [31, 11, 0.9], [34, 30, 1.3], [15, 32, 0.8], [24, 22, 1.6]].map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.9} />)}
    </Svg>
    {locked ? <View style={styles.lock}><Icon name="lock.fill" android="lock-closed" size={16} color="#FFFFFF" /></View>
      : selected ? <View style={styles.lock}><Icon name="checkmark" android="checkmark" size={18} color="#FFFFFF" /></View> : null}
  </View>;
}

/** Stars bursting out of the padlock when a code is accepted. */
function UnlockBurst({ color, onDone }: { color: string; onDone: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }); const t = setTimeout(onDone, 950); return () => clearTimeout(t); }, [p, onDone]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {Array.from({ length: 14 }, (_, i) => <BurstStar key={i} index={i} progress={p} color={i % 3 === 0 ? '#FFFFFF' : color} />)}
  </View>;
}
function BurstStar({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  const angle = (index / 14) * Math.PI * 2 + (index % 2) * 0.2;
  const dist = 34 + (index % 4) * 12;
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: Math.cos(angle) * dist * progress.value }, { translateY: Math.sin(angle) * dist * progress.value }, { scale: 1.4 - progress.value }],
  }));
  return <Animated.View style={[styles.burstStar, { backgroundColor: color, shadowColor: color }, style]} />;
}

/** « Galaxie » row in Settings › Ambiance: four variants, each unlocked with its own code. */
export default function GalaxyPicker() {
  const { theme, ambience, setAmbience } = useTheme();
  const { t } = useI18n();
  const [asking, setAsking] = useState<GalaxyId | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [burst, setBurst] = useState<GalaxyId | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const inputRef = useRef<TextInput>(null);

  const open = (id: GalaxyId) => {
    if (ambience.unlocked.includes(id)) { setAmbience({ accent: id }); return; }
    setCode(''); setError(false); setAsking(id);
  };
  const submit = () => {
    const found = variantForCode(code);
    if (!found) {
      setError(true);
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 50 }));
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return;
    }
    // A code unlocks its own variant, even if the user tapped another padlock.
    setAsking(null);
    setAmbience({ unlocked: Array.from(new Set([...ambience.unlocked, found])), accent: found });
    setBurst(found);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  return <View>
    <Text style={[FONTS.text.semibold, styles.label, { color: theme.sub }]}>Galaxie</Text>
    <View style={styles.row}>
      {GALAXY_IDS.map((id) => {
        const locked = !ambience.unlocked.includes(id); const selected = ambience.accent === id;
        return <Pressable3D key={id} accessibilityLabel={`${t(PALETTES[id].label)}${locked ? ` · ${t('verrouillé')}` : ''}`} accessibilityState={{ selected }} onPress={() => open(id)} tilt={0} sink={0.9} style={styles.item}>
          <View>
            <GalaxySwatch id={id} locked={locked} selected={selected} />
            {burst === id ? <UnlockBurst color={PALETTES[id].neon} onDone={() => setBurst(null)} /> : null}
          </View>
          <Text style={[selected ? FONTS.text.bold : FONTS.text.regular, { color: selected ? theme.text : theme.sub, fontSize: 12, marginTop: 6 }]}>{locked ? '???' : PALETTES[id].label}</Text>
        </Pressable3D>;
      })}
    </View>
    <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, lineHeight: 17, marginTop: 10 }]}>Variantes collector : chacune se débloque avec un code secret.</Text>

    <Modal visible={asking !== null} transparent animationType="fade" onRequestClose={() => setAsking(null)} onShow={() => setTimeout(() => inputRef.current?.focus(), 80)}>
      <Pressable style={styles.backdrop} onPress={() => setAsking(null)}>
        <Animated.View style={[styles.sheet, { backgroundColor: theme.cardSolid, borderColor: theme.outline }, shakeStyle]}>
          <Pressable onPress={() => undefined}>
            {asking ? <View style={{ alignItems: 'center' }}><GalaxySwatch id={asking} locked selected={false} /></View> : null}
            <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>Variante verrouillée</Text>
            <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, lineHeight: 19, textAlign: 'center' }]}>Entre le code secret pour la débloquer.</Text>
            <TextInput ref={inputRef} value={code} onChangeText={(v) => { setCode(v); setError(false); }} onSubmitEditing={submit} autoCapitalize="characters" autoCorrect={false} placeholder={t('CODE')} placeholderTextColor={theme.sub} maxLength={60} returnKeyType="done"
              style={[FONTS.mono.semibold, styles.input, { color: theme.text, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.cardAlt }]} />
            {error ? <Text style={[FONTS.text.semibold, { color: theme.danger, fontSize: 12, textAlign: 'center', marginTop: 8 }]}>Code invalide</Text> : null}
            <View style={{ marginTop: 16 }}><PrimaryButton label={t('Débloquer')} onPress={submit} /></View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  label: { fontSize: 12, letterSpacing: 0.4, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', minWidth: 60 },
  swatch: { width: SIZE + 4, height: SIZE + 4, borderRadius: (SIZE + 4) / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lock: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  burstStar: { position: 'absolute', left: (SIZE + 4) / 2 - 3, top: (SIZE + 4) / 2 - 3, width: 6, height: 6, borderRadius: 3, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sheet: { width: '100%', maxWidth: 360, borderRadius: 26, borderWidth: 1, padding: 22 },
  title: { fontSize: 22, textAlign: 'center', marginTop: 14, marginBottom: 6 },
  input: { marginTop: 16, borderWidth: 1.5, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, fontSize: 18, letterSpacing: 3, textAlign: 'center' },
});
