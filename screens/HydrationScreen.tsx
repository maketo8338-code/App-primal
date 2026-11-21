import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as NativeText, TextInput, View } from 'react-native';
import { I18nText as Text } from '../components/I18nText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { useStore } from '../lib/store';
import { Card, ProgressBar } from '../components/ui';
import { dateLabel, pct, shiftDate, todayKey } from '../lib/nutrition';
import { hydrationTargetForDay, totalHydrationMl, waterFromEntries } from '../lib/healthTargets';

const QUICK_AMOUNTS = [250, 500, 750];

export default function HydrationScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { t, formatNumber } = useI18n();
  const insets = useSafeAreaInsets();
  const { addWaterEntry, entriesForDate, habitsForDate, removeWaterEntry, updateTargets, updateWaterEntry, profile } = useStore();
  const [date, setDate] = useState(todayKey());
  const [waterInput, setWaterInput] = useState('');
  const habits = habitsForDate(date);
  const entries = entriesForDate(date);
  const foodWater = waterFromEntries(entries);
  const target = hydrationTargetForDay(profile, habits);
  const total = totalHydrationMl(habits.waterMl, foodWater);
  const progress = pct(total, target);

  const week = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDate(date, index - 6);
    const dayHabits = habitsForDate(key);
    const dayFoodWater = waterFromEntries(entriesForDate(key));
    const total = totalHydrationMl(dayHabits.waterMl, dayFoodWater);
    return { key, total, label: new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 1).toUpperCase() };
  });

  const changeTarget = (delta: number) => updateTargets({ waterMl: Math.max(500, target + delta) });
  const addManualWater = () => {
    const amount = Number(waterInput.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;
    addWaterEntry(date, Math.round(amount));
    setWaterInput('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} />
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>{t('common.back')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
        <Text style={[styles.title, FONTS.display.bold, { color: theme.text }]}>Hydratation</Text>
        <View style={styles.dateNav}>
          <Pressable onPress={() => setDate(shiftDate(date, -1))}><Icon name="chevron.left" android="chevron-back" size={19} color={theme.text} /></Pressable>
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15, textTransform: 'capitalize' }]}>{dateLabel(date)}</Text>
          <Pressable disabled={date >= todayKey()} onPress={() => setDate(shiftDate(date, 1))}>
            <Icon name="chevron.right" android="chevron-forward" size={19} color={date >= todayKey() ? theme.border : theme.text} />
          </Pressable>
        </View>

        <View style={styles.heroWrap}>
          <LinearGradient colors={['#38BDF8', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Icon name="drop.fill" android="water" size={30} color="#FFFFFF" />
            <Text style={[FONTS.display.bold, styles.heroAmount]}>{(total / 1000).toFixed(1)} L</Text>
            <Text style={[FONTS.text.semibold, styles.heroTarget]}>sur {(target / 1000).toFixed(1)} L · {progress}%</Text>
            <View style={styles.heroProgress}><View style={[styles.heroProgressFill, { width: `${Math.min(100, progress)}%` }]} /></View>
            <View style={styles.breakdown}><Text style={[FONTS.text.regular, styles.breakdownText]}>Eau bue : {(habits.waterMl / 1000).toFixed(2)} L</Text><Text style={[FONTS.text.regular, styles.breakdownText]}>Aliments : {foodWater.amount === undefined ? '—' : `${(foodWater.amount / 1000).toFixed(2)} L`}</Text></View>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionTitle, FONTS.display.semibold, { color: theme.text }]}>Ajouter de l’eau</Text>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((amount) => (
            <Pressable key={amount} onPress={() => addWaterEntry(date, amount)} style={({ pressed }) => [styles.quickButton, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.82 : 1 }]}>
              <Icon name="plus" android="add" size={20} color={theme.primary} />
              <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14, marginTop: 4 }]}>+{amount} ml</Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.manualRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput value={waterInput} onChangeText={setWaterInput} keyboardType="decimal-pad" placeholder="1800" placeholderTextColor={theme.sub} style={[FONTS.mono.semibold, styles.manualInput, { color: theme.text }]} />
          <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14 }]}>ml</Text>
          <Pressable onPress={addManualWater} style={[styles.manualButton, { backgroundColor: theme.primary }]}><Text style={[FONTS.text.semibold, { color: theme.onPrimary, fontSize: 14 }]}>Ajouter</Text></Pressable>
        </View>

        <Text style={[styles.sectionTitle, FONTS.display.semibold, { color: theme.text, marginTop: 22 }]}>Objectif quotidien</Text>
        <Card style={styles.targetCard}>
          <Pressable onPress={() => changeTarget(-250)} style={[styles.targetControl, { backgroundColor: theme.primarySoft }]}>
            <Icon name="minus" android="remove" size={18} color={theme.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[FONTS.display.bold, { color: theme.text, fontSize: 24 }]}>{(target / 1000).toFixed(1)} L</Text>
            <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2 }]}>par jour</Text>
          </View>
          <Pressable onPress={() => changeTarget(250)} style={[styles.targetControl, { backgroundColor: theme.primarySoft }]}>
            <Icon name="plus" android="add" size={18} color={theme.primary} />
          </Pressable>
        </Card>

        <Text style={[styles.sectionTitle, FONTS.display.semibold, { color: theme.text, marginTop: 22 }]}>Consommations enregistrées</Text>
        {habits.waterEntries.length ? (
          <View style={{ gap: 8 }}>
            {habits.waterEntries.map((entry) => (
              <Card key={entry.id} style={styles.entryCard}>
                <View style={[styles.entryIcon, { backgroundColor: theme.primarySoft }]}><Icon name="drop.fill" android="water" size={18} color={theme.primary} /></View>
                <Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 15, flex: 1 }]}>{entry.ml} ml</Text>
                <Pressable onPress={() => updateWaterEntry(date, entry.id, Math.max(50, entry.ml - 50))} style={styles.entryAction}>
                  <Icon name="minus" android="remove" size={16} color={theme.sub} />
                </Pressable>
                <Pressable onPress={() => updateWaterEntry(date, entry.id, entry.ml + 50)} style={styles.entryAction}>
                  <Icon name="plus" android="add" size={16} color={theme.primary} />
                </Pressable>
                <Pressable onPress={() => removeWaterEntry(date, entry.id)} style={styles.entryAction}>
                  <Icon name="trash" android="trash" size={16} color={theme.danger} />
                </Pressable>
              </Card>
            ))}
          </View>
        ) : (
          <Card><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14 }]}>Aucune consommation enregistrée pour cette journée.</Text></Card>
        )}

        <Text style={[styles.sectionTitle, FONTS.display.semibold, { color: theme.text, marginTop: 22 }]}>Les 7 derniers jours</Text>
        <Card>
          <View style={styles.weekRow}>
            {week.map((day) => {
              const value = Math.min(100, pct(day.total, target));
              return <View key={day.key} style={styles.weekColumn}><View style={styles.weekBarWrap}><View style={[styles.weekBar, { height: `${Math.max(4, value)}%`, backgroundColor: day.total >= target ? theme.success : theme.primary }]} /></View><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11 }]}>{day.label}</Text></View>;
            })}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 28, letterSpacing: -0.5 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 14, paddingHorizontal: 4 },
  heroWrap: { borderRadius: 24, overflow: 'hidden' },
  hero: { padding: 24, alignItems: 'center' },
  heroAmount: { color: '#FFFFFF', fontSize: 46, letterSpacing: -1, marginTop: 8 },
  heroTarget: { color: 'rgba(255,255,255,0.86)', fontSize: 15, marginTop: 2 },
  heroProgress: { width: '100%', height: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 18 },
  heroProgressFill: { height: '100%', borderRadius: 8, backgroundColor: '#FFFFFF' },
  sectionTitle: { fontSize: 19, letterSpacing: -0.3, marginBottom: 12, marginTop: 20 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18, borderWidth: 1 },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 16, padding: 10, marginTop: 10 },
  manualInput: { flex: 1, fontSize: 16, paddingVertical: 7 },
  manualButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  breakdown: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 14 },
  breakdownText: { color: 'rgba(255,255,255,0.78)', fontSize: 12, flexShrink: 1 },
  targetCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  targetControl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 12 },
  entryIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  entryAction: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', height: 120, alignItems: 'flex-end' },
  weekColumn: { flex: 1, alignItems: 'center', gap: 6 },
  weekBarWrap: { flex: 1, width: 18, justifyContent: 'flex-end', backgroundColor: 'rgba(37,99,235,0.10)', borderRadius: 8, overflow: 'hidden' },
  weekBar: { width: '100%', borderRadius: 8 },
});
