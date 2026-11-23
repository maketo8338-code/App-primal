import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text as NativeText, TextInput, View } from 'react-native';
import { NeonScrollView as ScrollView } from '../components/NeonScroll';
import { I18nText as Text } from '../components/I18nText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { Pressable3D } from '../components/motion';
import { useI18n } from '../lib/i18n';
import { FONTS } from '../lib/fonts';
import { Icon } from '../components/Icon';
import { useStore } from '../lib/store';
import { Card, ProgressBar } from '../components/ui';
import { pct, shiftDate, todayKey } from '../lib/nutrition';
import { formatSleepDuration, parseSleepDurationInput, sleepProgress, sleepRegularity } from '../lib/sleepSync';
import { sleepTargetForAge } from '../lib/healthTargets';

/** Allowed ideal sleep range (adult guidelines are about 7–9 h). */
const SLEEP_MIN = 6.5; const SLEEP_MAX = 10.5;

export default function SleepScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { t, formatDate } = useI18n();
  const insets = useSafeAreaInsets();
  const { setHabit, habitsForDate, profile, updateTargets } = useStore();
  const [date, setDate] = useState(todayKey());
  const [sleepInput, setSleepInput] = useState('');
  const habits = habitsForDate(date);
  const target = Math.max(SLEEP_MIN, profile.targetOverrides?.sleepH ?? sleepTargetForAge(profile.age));
  const targetMax = Math.min(SLEEP_MAX, Math.max(target, profile.targetOverrides?.sleepMaxH ?? target + 0.5));
  const isToday = date === todayKey();
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(todayKey(), index - 6);
    return { day, sleep: habitsForDate(day).sleepH, label: new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 1).toUpperCase() };
  }), [habitsForDate]);
  const regularity = sleepRegularity(week.map((item) => item.sleep));
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const stepSleep = (amount: number) => setHabit(date, { sleepH: Math.max(0, Math.round((habits.sleepH + amount) * 10) / 10), sleepSource: 'manual' });
  const saveSleepInput = () => {
    const hours = parseSleepDurationInput(sleepInput);
    if (hours !== undefined && hours <= 24) setHabit(date, { sleepH: Math.round(hours * 4) / 4, sleepSource: 'manual' });
    setSleepInput('');
  };

  return <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}><Pressable3D onPress={onBack} style={[styles.back, { borderColor: theme.outline, backgroundColor: theme.card }]}><Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>{t('common.back')}</Text></Pressable3D></View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <Text style={[styles.title, FONTS.display.semibold, { color: theme.text }]}>Sommeil</Text>
      <View style={styles.dateNav}><Pressable3D onPress={() => setDate(shiftDate(date, -1))}><Icon name="chevron.left" android="chevron-back" size={22} color={theme.primary} /></Pressable3D><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14, flex: 1, textAlign: 'center', textTransform: 'capitalize' }]}>{isToday ? "Aujourd'hui" : dateLabel}</Text><Pressable3D disabled={isToday} onPress={() => setDate(shiftDate(date, 1))} style={{ opacity: isToday ? 0.3 : 1 }}><Icon name="chevron.right" android="chevron-forward" size={22} color={theme.primary} /></Pressable3D></View>
      <View style={styles.heroWrap}><LinearGradient colors={theme.sleepGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}><Icon name="moon.fill" android="moon" size={29} color="#FFFFFF" /><Text style={[FONTS.display.bold, { color: '#FFFFFF', fontSize: 43, letterSpacing: -0.8, marginTop: 8 }]}>{formatSleepDuration(habits.sleepH)}</Text><Text style={[FONTS.text.regular, { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 2 }]}>sur {formatSleepDuration(target)}</Text><View style={styles.whiteTrack}><View style={[styles.whiteFill, { width: `${Math.min(100, sleepProgress(habits.sleepH, target) || 0)}%` }]} /></View></LinearGradient></View>

      <Text style={[styles.section, FONTS.display.semibold, { color: theme.text }]}>Durée de sommeil</Text>
      <Card style={styles.durationCard}><Pressable3D onPress={() => stepSleep(-0.25)}><Icon name="minus.circle.fill" android="remove-circle" size={27} color={theme.sub} /></Pressable3D><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 19, flex: 1, textAlign: 'center' }]}>{habits.sleepH ? formatSleepDuration(habits.sleepH) : 'Non renseigné'}</Text><Pressable3D onPress={() => stepSleep(0.25)}><Icon name="plus.circle.fill" android="add-circle" size={27} color={theme.primary} /></Pressable3D></Card>
      <View style={styles.quick}>{[6, 7, 8, 9].map((hours) => <Pressable3D key={hours} onPress={() => setHabit(date, { sleepH: hours, sleepSource: 'manual' })} style={[styles.chip, { backgroundColor: habits.sleepH === hours ? theme.primarySoft : theme.card, borderColor: habits.sleepH === hours ? theme.primary : theme.border }]}><Text style={[FONTS.text.semibold, { color: habits.sleepH === hours ? theme.primary : theme.text, fontSize: 13 }]}>{hours} h</Text></Pressable3D>)}</View>
      <View style={[styles.manualRow, { backgroundColor: theme.card, borderColor: theme.border }]}><TextInput value={sleepInput} onChangeText={setSleepInput} onSubmitEditing={saveSleepInput} placeholder="8 h 45" placeholderTextColor={theme.sub} style={[FONTS.mono.semibold, styles.manualInput, { color: theme.text }]} /><Pressable3D onPress={saveSleepInput} style={[styles.manualButton, { backgroundColor: theme.primary }]}><Text style={[FONTS.text.semibold, { color: theme.onPrimary, fontSize: 14 }]}>Enregistrer</Text></Pressable3D></View>
      <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 8 }]}>Repère indicatif basé sur l’âge renseigné, pas une prescription médicale.</Text>

      <Text style={[styles.section, FONTS.display.semibold, { color: theme.text }]}>Horaires</Text>
      <Card><View style={styles.inputRow}><Icon name="moon.fill" android="moon" size={18} color={theme.sub} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, flex: 1 }]}>Coucher</Text><TextInput value={habits.sleepBedtime || ''} onChangeText={(sleepBedtime) => setHabit(date, { sleepBedtime, sleepSource: 'manual' })} placeholder="22:45" placeholderTextColor={theme.sub} style={[FONTS.mono.semibold, styles.timeInput, { borderColor: theme.border, color: theme.text }]} /></View><View style={[styles.inputRow, { borderTopWidth: 1, borderTopColor: theme.border }]}><Icon name="sun.max.fill" android="sunny" size={18} color={theme.sub} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, flex: 1 }]}>Réveil</Text><TextInput value={habits.sleepWakeTime || ''} onChangeText={(sleepWakeTime) => setHabit(date, { sleepWakeTime, sleepSource: 'manual' })} placeholder="06:45" placeholderTextColor={theme.sub} style={[FONTS.mono.semibold, styles.timeInput, { borderColor: theme.border, color: theme.text }]} /></View></Card>

      <Text style={[styles.section, FONTS.display.semibold, { color: theme.text }]}>Objectif quotidien</Text>
      <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, lineHeight: 17, marginBottom: 10 }]}>Ta plage idéale : le score vaut 100 % entre ces deux durées, puis baisse progressivement.</Text>
      <Card style={styles.durationCard}><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 13, width: 28 }]}>De</Text><Pressable3D onPress={() => updateTargets({ sleepH: Math.max(SLEEP_MIN, Math.round((target - 0.25) * 100) / 100) })}><Icon name="minus.circle.fill" android="remove-circle" size={27} color={theme.sub} /></Pressable3D><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 18, flex: 1, textAlign: 'center' }]}>{formatSleepDuration(target)}</Text><Pressable3D onPress={() => { const next = Math.min(SLEEP_MAX - 0.5, Math.round((target + 0.25) * 100) / 100); updateTargets({ sleepH: next, ...(next > targetMax ? { sleepMaxH: next } : {}) }); }}><Icon name="plus.circle.fill" android="add-circle" size={27} color={theme.primary} /></Pressable3D></Card>
      <Card style={[styles.durationCard, { marginTop: 8 }]}><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 13, width: 28 }]}>À</Text><Pressable3D onPress={() => { const next = Math.max(SLEEP_MIN, Math.round((targetMax - 0.25) * 100) / 100); updateTargets({ sleepMaxH: next, ...(next < target ? { sleepH: next } : {}) }); }}><Icon name="minus.circle.fill" android="remove-circle" size={27} color={theme.sub} /></Pressable3D><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 18, flex: 1, textAlign: 'center' }]}>{formatSleepDuration(targetMax)}</Text><Pressable3D onPress={() => updateTargets({ sleepMaxH: Math.min(SLEEP_MAX, Math.round((targetMax + 0.25) * 100) / 100) })}><Icon name="plus.circle.fill" android="add-circle" size={27} color={theme.primary} /></Pressable3D></Card>

      <Text style={[styles.section, FONTS.display.semibold, { color: theme.text }]}>Régularité et évolution</Text>
      <Card><View style={styles.regularity}><View style={{ flex: 1 }}><Text style={[FONTS.display.bold, { color: regularity === undefined ? theme.sub : regularity >= 80 ? theme.success : theme.warn, fontSize: 32 }]}>{regularity === undefined ? '—' : `${regularity}%`}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, marginTop: 2 }]}>Régularité sur 7 jours</Text></View><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, maxWidth: 126 }]}>Basée sur la variation de tes nuits renseignées.</Text></View><View style={styles.week}>{week.map((item) => <View key={item.day} style={styles.weekCol}><View style={[styles.barTrack, { backgroundColor: theme.cardAlt }]}><View style={[styles.bar, { height: `${Math.max(4, Math.min(100, pct(item.sleep, target)))}%`, backgroundColor: item.sleep >= target ? theme.success : theme.primary }]} /></View><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11 }]}>{item.label}</Text></View>)}</View></Card>
      <View style={[styles.note, { backgroundColor: theme.cardAlt }]}><Icon name="info.circle" android="information-circle" size={17} color={theme.sub} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, lineHeight: 18, flex: 1 }]}>Tes données de sommeil participent à la note santé dès qu’une durée est renseignée. Santé, Health Connect et les montres pourront être connectés plus tard, sans générer de données fictives.</Text></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingLeft: 8, paddingRight: 14 }, title: { fontSize: 31, letterSpacing: -0.4, marginBottom: 12 }, dateNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }, heroWrap: { borderRadius: 24, overflow: 'hidden' }, hero: { padding: 22, alignItems: 'center' }, whiteTrack: { width: '100%', height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.24)', overflow: 'hidden', marginTop: 18 }, whiteFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 }, section: { fontSize: 21, letterSpacing: -0.3, marginTop: 24, marginBottom: 10 }, durationCard: { flexDirection: 'row', alignItems: 'center' }, quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, manualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 16, padding: 10, marginTop: 10 }, manualInput: { flex: 1, fontSize: 16, paddingVertical: 7 }, manualButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }, chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15 }, inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }, timeInput: { width: 68, fontSize: 15, borderBottomWidth: 1, textAlign: 'right', paddingVertical: 4 }, regularity: { flexDirection: 'row', alignItems: 'center', gap: 10 }, week: { height: 116, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 18 }, weekCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }, barTrack: { width: '100%', flex: 1, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' }, bar: { width: '100%', borderRadius: 7 }, note: { flexDirection: 'row', gap: 9, padding: 15, borderRadius: 16, marginTop: 18, alignItems: 'flex-start' } });
