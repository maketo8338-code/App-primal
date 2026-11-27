import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { I18nText as Text } from '../components/I18nText';
import { PrimaryButton } from '../components/ui';
import { Pressable3D } from '../components/motion';
import { Icon } from '../components/Icon';
import { useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { useStore } from '../lib/store';
import { todayKey } from '../lib/nutrition';
import { useI18n } from '../lib/i18n';
import { useDayKey } from '../lib/useDayKey';

const KEY = 'primal.weighPrompt.v1';
const MIN = 25; const MAX = 300;

/**
 * « Un changement ? » — once a day, at the first opening (it sits under the
 * launch animation, so it appears when the intro ends). Weigh-ins let the app
 * replace formulas with your real expenditure (see energyHistory.ts).
 * Not shown on the day of the onboarding (the weight was just entered).
 */
export default function WeightPrompt() {
  const { theme } = useTheme();
  const { t, formatNumber } = useI18n();
  const { ready, profile, setHabit, updateProfile } = useStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const current = profile.weightKg;
  const day = useDayKey();

  useEffect(() => {
    if (!ready || !profile.onboarded || !current) return;
    const today = todayKey();
    AsyncStorage.getItem(KEY).then((last) => {
      if (!last) { void AsyncStorage.setItem(KEY, today); return; } // first day: weight was just entered in the onboarding
      if (last !== today) { setValue(String(current).replace('.', ',')); setOpen(true); }
    }).catch(() => undefined);
  }, [ready, profile.onboarded, current, day]);

  const close = () => { setOpen(false); void AsyncStorage.setItem(KEY, todayKey()).catch(() => undefined); };
  // Android back button closes the prompt (same as « Plus tard »).
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  }, [open]);
  const parsed = Number(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed >= MIN && parsed <= MAX;
  const step = (delta: number) => {
    const base = valid ? parsed : current ?? 70;
    const next = Math.round(Math.min(MAX, Math.max(MIN, base + delta)) * 10) / 10;
    setValue(String(next).replace('.', ','));
    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
  };
  const save = (weight: number) => {
    const w = Math.round(weight * 10) / 10;
    setHabit(todayKey(), { weight: w });
    if (w !== current) updateProfile({ weightKg: w });
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    close();
  };

  if (!open || !current) return null;
  return <View style={styles.backdrop}>
    <View style={[styles.sheet, { backgroundColor: theme.cardSolid, borderColor: theme.outline }]}>
      <Text style={[FONTS.text.bold, styles.eyebrow, { color: theme.primary }]}>PESÉE DU JOUR</Text>
      <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>Un changement ?</Text>
      <Text style={[FONTS.text.regular, styles.sub, { color: theme.sub }]}>Si ton poids a bougé, note-le : VISOLIS ajuste ton objectif calorique avec ta dépense réelle.</Text>
      <View style={styles.row}>
        <Pressable3D accessibilityLabel="−0,1 kg" onPress={() => step(-0.1)} style={[styles.round, { borderColor: theme.border, backgroundColor: theme.cardAlt }]}><Icon name="minus" android="remove" size={22} color={theme.text} /></Pressable3D>
        <View style={styles.valueBox}>
          <TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" maxLength={5} style={[FONTS.display.bold, styles.input, { color: theme.text, borderColor: valid ? theme.border : theme.danger }]} />
          <Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 14 }]}>kg</Text>
        </View>
        <Pressable3D accessibilityLabel="+0,1 kg" onPress={() => step(0.1)} style={[styles.round, { borderColor: theme.border, backgroundColor: theme.cardAlt }]}><Icon name="plus" android="add" size={22} color={theme.text} /></Pressable3D>
      </View>
      <Text style={[FONTS.text.regular, styles.hint, { color: theme.sub }]}>{`${t('Dernier poids')} : ${formatNumber(current)} kg`}</Text>
      <PrimaryButton label={t('Enregistrer')} disabled={!valid} onPress={() => save(parsed)} />
      <Pressable3D onPress={() => save(current)} tilt={0} sink={0.97} style={[styles.secondary, { borderColor: theme.outline }]}>
        <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Pas de changement</Text>
      </Pressable3D>
      <Pressable onPress={close} style={styles.later}><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13 }]}>Plus tard</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  // Below the launch animation (zIndex 1000), above the app.
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 900, elevation: 900, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 380, borderRadius: 28, borderWidth: 1, padding: 22 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, textAlign: 'center' },
  title: { fontSize: 26, textAlign: 'center', marginTop: 6 },
  sub: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 },
  round: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  valueBox: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 1 },
  input: { fontSize: 40, width: 120, textAlign: 'center', borderBottomWidth: 1.5, paddingVertical: 2 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 10, marginBottom: 16 },
  secondary: { marginTop: 10, borderWidth: 1.5, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  later: { alignItems: 'center', paddingTop: 12 },
});
