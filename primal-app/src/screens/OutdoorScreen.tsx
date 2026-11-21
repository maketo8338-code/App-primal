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
import { Card } from '../components/ui';
import { pct, shiftDate, todayKey } from '../lib/nutrition';
import { outdoorTargetForActivity } from '../lib/healthTargets';

const QUICK = [10, 20, 30, 60];

export default function OutdoorScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { t, formatNumber } = useI18n();
  const insets = useSafeAreaInsets();
  const { setHabit, habitsForDate, profile, updateTargets } = useStore();
  const [date, setDate] = useState(todayKey());
  const [outdoorInput, setOutdoorInput] = useState('');
  const habits = habitsForDate(date);
  const target = profile.targetOverrides?.outdoorMin ?? outdoorTargetForActivity(profile.activityLevel);
  const isToday = date === todayKey();
  const progress = pct(habits.outdoorMin, target);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(todayKey(), index - 6);
    return { day, min: habitsForDate(day).outdoorMin, label: new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 1).toUpperCase() };
  }), [habitsForDate]);
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <Pressable3D onPress={onBack} style={[styles.backBtn, { borderColor: theme.outline, backgroundColor: theme.card }]}>
          <Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} />
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>{t('common.back')}</Text>
        </Pressable3D>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16), paddingTop: 12 }}>
        <Text style={[styles.title, FONTS.display.semibold, { color: theme.text }]}>Temps extérieur</Text>
        <View style={styles.dateNav}>
          <Pressable3D onPress={() => setDate(shiftDate(date, -1))}><Icon name="chevron.left" android="chevron-back" size={22} color={theme.primary} /></Pressable3D>
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14, flex: 1, textAlign: 'center', textTransform: 'capitalize' }]}>{isToday ? "Aujourd'hui" : dateLabel}</Text>
          <Pressable3D disabled={isToday} onPress={() => setDate(shiftDate(date, 1))} style={{ opacity: isToday ? 0.3 : 1 }}><Icon name="chevron.right" android="chevron-forward" size={22} color={theme.primary} /></Pressable3D>
        </View>

        <View style={{ overflow: 'hidden', borderRadius: 24, marginBottom: 16 }}>
          <LinearGradient colors={theme.outdoorGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
            <Icon name="sun.max.fill" android="sunny" size={36} color="#FFFFFF" />
            <Text style={[FONTS.display.bold, { color: '#FFFFFF', fontSize: 52, marginTop: 8 }]}>{habits.outdoorMin}</Text>
            <Text style={[FONTS.text.semibold, { color: 'rgba(255,255,255,0.9)', fontSize: 16 }]}>/ {target} min dehors</Text>
            <View style={{ width: '100%', marginTop: 16 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, progress)}%`, height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 }} />
              </View>
            </View>
            <Text style={[FONTS.mono.semibold, { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 10 }]}>{Math.min(100, progress)}% de l'objectif</Text>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionLabel, FONTS.display.semibold, { color: theme.text }]}>Ajouter du temps</Text>
        <View style={styles.quickRow}>
          {QUICK.map((min) => (
            <Pressable3D
              key={min}
              onPress={() => setHabit(date, { outdoorMin: habits.outdoorMin + min })}
              style={[styles.quickBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Icon name="plus" android="add" size={18} color={theme.accent} />
              <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14 }]}>{min} min</Text>
            </Pressable3D>
          ))}
        </View>
        {habits.outdoorMin > 0 && (
          <Pressable3D onPress={() => setHabit(date, { outdoorMin: Math.max(0, habits.outdoorMin - 10) })}>
            <Text style={[FONTS.text.semibold, { color: theme.danger, fontSize: 14, textAlign: 'center', marginTop: 12 }]}>Retirer 10 min</Text>
          </Pressable3D>
        )}
        <View style={[styles.manualRow, { backgroundColor: theme.card, borderColor: theme.border }]}><TextInput value={outdoorInput} onChangeText={setOutdoorInput} onSubmitEditing={() => { const value = Number(outdoorInput.replace(',', '.')); if (Number.isFinite(value) && value >= 0) setHabit(date, { outdoorMin: Math.round(value) }); setOutdoorInput(''); }} placeholder="120" placeholderTextColor={theme.sub} keyboardType="number-pad" style={[FONTS.mono.semibold, styles.manualInput, { color: theme.text }]} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14 }]}>min</Text><Pressable3D onPress={() => { const value = Number(outdoorInput.replace(',', '.')); if (Number.isFinite(value) && value >= 0) setHabit(date, { outdoorMin: Math.round(value) }); setOutdoorInput(''); }} style={[styles.manualButton, { backgroundColor: theme.primary }]}><Text style={[FONTS.text.semibold, { color: theme.onPrimary, fontSize: 14 }]}>Appliquer</Text></Pressable3D></View>

        <Text style={[styles.sectionLabel, FONTS.display.semibold, { color: theme.text, marginTop: 24 }]}>Objectif quotidien</Text>
        <Card style={styles.goalCard}>
          <Pressable3D onPress={() => updateTargets({ outdoorMin: Math.max(10, target - 5) })}><Icon name="minus.circle.fill" android="remove-circle" size={27} color={theme.sub} /></Pressable3D>
          <Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 18, flex: 1, textAlign: 'center' }]}>{target} min</Text>
          <Pressable3D onPress={() => updateTargets({ outdoorMin: Math.min(240, target + 5) })}><Icon name="plus.circle.fill" android="add-circle" size={27} color={theme.primary} /></Pressable3D>
        </Card>

        <Text style={[styles.sectionLabel, FONTS.display.semibold, { color: theme.text, marginTop: 24 }]}>Historique sur 7 jours</Text>
        <Card>
          <View style={styles.week}>
            {week.map((item) => (
              <View key={item.day} style={styles.weekCol}>
                <View style={[styles.barTrack, { backgroundColor: theme.cardAlt }]}>
                  <View style={[styles.bar, { height: `${Math.max(4, Math.min(100, pct(item.min, target)))}%`, backgroundColor: item.min >= target ? theme.success : theme.accent }]} />
                </View>
                <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11 }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={[styles.noteBox, { backgroundColor: theme.cardAlt }]}>
          <Icon name="info.circle" android="information-circle" size={18} color={theme.sub} />
          <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, flex: 1, lineHeight: 18 }]}>
            Cette habitude suit uniquement le temps passé dehors. PRIMAL ne calcule pas la vitamine D produite et ne donne aucune recommandation médicale d'exposition solaire.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingLeft: 8, paddingRight: 14 },
  title: { fontSize: 29, letterSpacing: -0.4, marginBottom: 12 },
  dateNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionLabel: { fontSize: 21, letterSpacing: -0.3, marginBottom: 12 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, manualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 16, padding: 10, marginTop: 10 }, manualInput: { flex: 1, fontSize: 16, paddingVertical: 7 }, manualButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  quickBtn: { flexGrow: 1, flexBasis: '22%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5 },
  goalCard: { flexDirection: 'row', alignItems: 'center' },
  week: { height: 116, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  weekCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  barTrack: { width: '100%', flex: 1, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 7 },
  noteBox: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 16, marginTop: 24, alignItems: 'flex-start' },
});
