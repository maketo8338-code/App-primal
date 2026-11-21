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
import { ACTIVITY_TYPES, activityDuration, estimateActivityCalories, knownActiveCalories } from '../lib/activitySync';
import { ActivityIntensity } from '../types';

const INTENSITIES: ActivityIntensity[] = ['douce', 'modérée', 'intense'];

export default function ActivityScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { t, formatNumber } = useI18n();
  const insets = useSafeAreaInsets();
  const { setHabit, addActivity, removeActivity, habitsForDate, profile, updateTargets } = useStore();
  const [date, setDate] = useState(todayKey());
  const [selectedType, setSelectedType] = useState<string>(ACTIVITY_TYPES[0]);
  const [customName, setCustomName] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [intensity, setIntensity] = useState<ActivityIntensity>('modérée');
  const [distance, setDistance] = useState('');
  const [kcalInput, setKcalInput] = useState('');
  const [stepsInput, setStepsInput] = useState('');
  const habits = habitsForDate(date);
  const isToday = date === todayKey();
  const duration = activityDuration(habits);
  const activeKcal = knownActiveCalories(habits);
  const progress = pct(habits.steps, profile.targets.steps);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(todayKey(), index - 6);
    return { day, steps: habitsForDate(day).steps, label: new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 1).toUpperCase() };
  }), [habitsForDate]);
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const addWorkout = () => {
    const enteredMinutes = Math.round(Number(minutes.replace(',', '.')) || 0);
    if (enteredMinutes < 1) return;
    const parsedMinutes = enteredMinutes;
    const parsedDistance = Number(distance.replace(',', '.'));
    const parsedKcal = Number(kcalInput.replace(',', '.'));
    const activityName = selectedType === 'Autre activité' ? customName.trim() || selectedType : selectedType;
    const estimatedKcal = estimateActivityCalories(activityName, parsedMinutes, profile.weightKg, intensity);
    addActivity(date, { name: activityName, minutes: parsedMinutes, intensity, kcal: Number.isFinite(parsedKcal) && parsedKcal > 0 ? Math.round(parsedKcal) : estimatedKcal, distanceKm: parsedDistance > 0 ? parsedDistance : undefined, source: 'manual' });
    setMinutes('30');
    setDistance('');
    setKcalInput('');
  };

  return <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
      <Pressable3D onPress={onBack} style={[styles.back, { borderColor: theme.outline, backgroundColor: theme.card }]}><Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>{t('common.back')}</Text></Pressable3D>
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <Text style={[styles.title, FONTS.display.semibold, { color: theme.text }]}>Activité</Text>
      <View style={styles.dateNav}><Pressable3D onPress={() => setDate(shiftDate(date, -1))}><Icon name="chevron.left" android="chevron-back" size={22} color={theme.primary} /></Pressable3D><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14, flex: 1, textAlign: 'center', textTransform: 'capitalize' }]}>{isToday ? "Aujourd'hui" : dateLabel}</Text><Pressable3D disabled={isToday} onPress={() => setDate(shiftDate(date, 1))} style={{ opacity: isToday ? 0.3 : 1 }}><Icon name="chevron.right" android="chevron-forward" size={22} color={theme.primary} /></Pressable3D></View>
      <View style={styles.heroWrap}><LinearGradient colors={theme.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={[FONTS.text.semibold, { color: 'rgba(255,255,255,0.84)', fontSize: 14 }]}>Pas du jour</Text>
        <Text style={[FONTS.display.bold, { color: '#FFFFFF', fontSize: 44, letterSpacing: -1, marginTop: 4 }]}>{habits.steps.toLocaleString('fr-FR')}</Text>
        <Text style={[FONTS.text.regular, { color: 'rgba(255,255,255,0.86)', fontSize: 14 }]}>/ {profile.targets.steps.toLocaleString('fr-FR')} pas</Text>
        <View style={styles.whiteTrack}><View style={[styles.whiteFill, { width: `${Math.min(100, progress)}%` }]} /></View>
        <View style={styles.metrics}><Metric value={habits.distanceKm ? `${habits.distanceKm.toFixed(1)} km` : '—'} label="Distance" /><Metric value={`${duration} min`} label="Durée" /><Metric value={activeKcal ? `${activeKcal} kcal` : '—'} label="Actives" /></View>
      </LinearGradient></View>

      <Text style={[styles.label, FONTS.display.semibold, { color: theme.text }]}>Pas et objectif</Text>
      <Card style={styles.stepCard}><Pressable3D onPress={() => setHabit(date, { steps: Math.max(0, habits.steps - 500) })}><Icon name="minus" android="remove" size={22} color={theme.sub} /></Pressable3D><TextInput value={stepsInput} onChangeText={setStepsInput} onSubmitEditing={() => { const value = Number(stepsInput.replace(',', '.')); if (Number.isFinite(value) && value >= 0) setHabit(date, { steps: Math.round(value) }); setStepsInput(''); }} placeholder={habits.steps.toLocaleString('fr-FR')} placeholderTextColor={theme.sub} keyboardType="number-pad" style={[FONTS.mono.semibold, styles.stepInput, { color: theme.text, borderColor: theme.border }]} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13 }]}>pas</Text><Pressable3D onPress={() => setHabit(date, { steps: habits.steps + 500 })}><Icon name="plus" android="add" size={22} color={theme.primary} /></Pressable3D></Card>
      <View style={styles.targetRow}><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, flex: 1 }]}>Objectif quotidien</Text><Pressable3D onPress={() => updateTargets({ steps: Math.max(1000, profile.targets.steps - 1000) })}><Icon name="minus.circle.fill" android="remove-circle" size={24} color={theme.sub} /></Pressable3D><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 13, width: 88, textAlign: 'center' }]}>{profile.targets.steps.toLocaleString('fr-FR')}</Text><Pressable3D onPress={() => updateTargets({ steps: profile.targets.steps + 1000 })}><Icon name="plus.circle.fill" android="add-circle" size={24} color={theme.primary} /></Pressable3D></View>

      <Text style={[styles.label, FONTS.display.semibold, { color: theme.text }]}>Ajouter une activité</Text>
      <View style={styles.chips}>{ACTIVITY_TYPES.map((type) => <Pressable3D key={type} onPress={() => setSelectedType(type)} style={[styles.chip, { borderColor: selectedType === type ? theme.primary : theme.border, backgroundColor: selectedType === type ? theme.primarySoft : theme.card }]}><Text style={[FONTS.text.semibold, { color: selectedType === type ? theme.primary : theme.text, fontSize: 13 }]}>{type}</Text></Pressable3D>)}</View>
      <Card style={{ marginTop: 12 }}>
        {selectedType === 'Autre activité' ? <View style={styles.inputRow}><TextInput value={customName} onChangeText={setCustomName} placeholder="Nom de l’activité" placeholderTextColor={theme.sub} style={[FONTS.text.regular, styles.nameInput, { color: theme.text, borderColor: theme.border }]} /></View> : null}
        <View style={styles.inputRow}><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, flex: 1 }]}>Durée</Text><TextInput value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" style={[FONTS.mono.semibold, styles.input, { color: theme.text, borderColor: theme.border }]} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13 }]}>min</Text></View>
        <View style={styles.inputRow}><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, flex: 1 }]}>Distance (si connue)</Text><TextInput value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={theme.sub} style={[FONTS.mono.semibold, styles.input, { color: theme.text, borderColor: theme.border }]} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13 }]}>km</Text></View>
        <View style={styles.inputRow}><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, flex: 1 }]}>Calories (optionnel)</Text><TextInput value={kcalInput} onChangeText={setKcalInput} keyboardType="decimal-pad" placeholder="auto" placeholderTextColor={theme.sub} style={[FONTS.mono.semibold, styles.input, { color: theme.text, borderColor: theme.border }]} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13 }]}>kcal</Text></View>
        <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, marginTop: 14, marginBottom: 8 }]}>Intensité</Text><View style={styles.chips}>{INTENSITIES.map((value) => <Pressable3D key={value} onPress={() => setIntensity(value)} style={[styles.chip, { borderColor: intensity === value ? theme.primary : theme.border, backgroundColor: intensity === value ? theme.primarySoft : theme.card }]}><Text style={[FONTS.text.semibold, { color: intensity === value ? theme.primary : theme.text, fontSize: 13, textTransform: 'capitalize' }]}>{value}</Text></Pressable3D>)}</View>
        <Pressable3D onPress={addWorkout} style={[styles.addButton, { backgroundColor: theme.primary }]}><Icon name="plus" android="add" size={18} color={theme.onPrimary} /><Text style={[FONTS.text.semibold, { color: theme.onPrimary, fontSize: 15 }]}>Enregistrer l’activité</Text></Pressable3D>
      </Card>

      <Text style={[styles.label, FONTS.display.semibold, { color: theme.text }]}>Activités du jour</Text>
      <Card style={{ paddingVertical: habits.activities.length ? 4 : 18 }}>{habits.activities.length ? habits.activities.map((activity, index) => <View key={activity.id} style={[styles.activityRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}><View style={{ flex: 1 }}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>{activity.name}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2 }]}>{activity.minutes} min · {activity.intensity || 'modérée'}{activity.kcal ? ` · ${activity.kcal} kcal estimées` : ''}</Text></View><Pressable3D onPress={() => removeActivity(date, activity.id)}><Icon name="trash" android="trash" size={19} color={theme.danger} /></Pressable3D></View>) : <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, textAlign: 'center' }]}>Aucune activité enregistrée.</Text>}</Card>

      <Text style={[styles.label, FONTS.display.semibold, { color: theme.text }]}>Évolution sur 7 jours</Text>
      <Card><View style={styles.week}>{week.map((item) => <View key={item.day} style={styles.weekCol}><View style={[styles.barTrack, { backgroundColor: theme.cardAlt }]}><View style={[styles.bar, { height: `${Math.max(4, Math.min(100, pct(item.steps, profile.targets.steps)))}%`, backgroundColor: item.steps >= profile.targets.steps ? theme.success : theme.primary }]} /></View><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11 }]}>{item.label}</Text></View>)}</View></Card>
      <View style={[styles.note, { backgroundColor: theme.cardAlt }]}><Icon name="info.circle" android="information-circle" size={17} color={theme.sub} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, lineHeight: 18, flex: 1 }]}>Les saisies manuelles sont déjà prises en compte dans ta note santé. L’architecture prévoit aussi la connexion future à Health Connect, Santé et aux montres, sans simuler de données.</Text></View>
    </ScrollView>
  </View>;
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={{ flex: 1 }}><Text style={[FONTS.mono.semibold, { color: '#FFFFFF', fontSize: 14 }]} numberOfLines={1}>{value}</Text><Text style={[FONTS.text.regular, { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }]}>{label}</Text></View>; }

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingLeft: 8, paddingRight: 14 }, title: { fontSize: 31, letterSpacing: -0.4, marginBottom: 12 }, dateNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }, heroWrap: { borderRadius: 24, overflow: 'hidden' }, hero: { padding: 22 }, whiteTrack: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 15 }, whiteFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' }, metrics: { flexDirection: 'row', gap: 8, marginTop: 18 }, label: { fontSize: 21, letterSpacing: -0.3, marginTop: 24, marginBottom: 10 }, stepCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginTop: 12 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 }, inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }, input: { width: 66, borderBottomWidth: 1, textAlign: 'right', fontSize: 15, paddingVertical: 4 }, nameInput: { flex: 1, borderBottomWidth: 1, fontSize: 15, paddingVertical: 6 }, stepInput: { flex: 1, minWidth: 70, borderBottomWidth: 1, textAlign: 'center', fontSize: 16, paddingVertical: 4 }, addButton: { minHeight: 46, borderRadius: 999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 18 }, activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, week: { height: 118, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }, weekCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }, barTrack: { width: '100%', flex: 1, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' }, bar: { width: '100%', borderRadius: 7 }, note: { flexDirection: 'row', gap: 9, padding: 15, borderRadius: 16, marginTop: 18, alignItems: 'flex-start' },
});
