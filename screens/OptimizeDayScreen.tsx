import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from '../components/I18nText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { Card, PrimaryButton } from '../components/ui';
import { useStore } from '../lib/store';
import { formatNutrientValue, scoreTotalsForEntries, todayKey } from '../lib/nutrition';
import { calculateDailyNutritionTargets, targetsWithDynamicMacros } from '../lib/energy';
import { optimizeDay, OptimizerSuggestion } from '../lib/optimizer';
import { Food } from '../types';

interface Props { onBack: () => void; onOpenFood: (food: Food) => void; }

export default function OptimizeDayScreen({ onBack, onOpenFood }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { entriesForDate, habitsForDate, profile } = useStore();
  const date = todayKey();
  const entries = entriesForDate(date);
  const habits = habitsForDate(date);
  const totals = useMemo(() => scoreTotalsForEntries(entries), [entries]);
  const dailyTargets = useMemo(() => calculateDailyNutritionTargets(profile, habits, totals), [profile, habits, totals]);
  const energy = dailyTargets.energy;
  const targets = useMemo(() => targetsWithDynamicMacros(profile, dailyTargets.macros), [profile, dailyTargets.macros]);
  const plan = useMemo(() => optimizeDay(entries, targets), [entries, targets]);
  const priorities = plan.priorities.slice(0, 3);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}><Pressable onPress={onBack} style={styles.back}><Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>Retour</Text></Pressable></View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <View style={{ overflow: 'hidden', borderRadius: 24 }}><LinearGradient colors={theme.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}><Icon name="bolt.fill" android="flash" size={30} color="#FFFFFF" /><Text style={[FONTS.display.bold, { color: '#FFFFFF', fontSize: 27, letterSpacing: -0.5, marginTop: 11 }]}>Optimiser ma journée</Text><Text style={[FONTS.text.regular, { color: 'rgba(255,255,255,0.87)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 7 }]}>Des choix ciblés à partir de ce que tu as déjà enregistré.</Text></LinearGradient></View>
      <Text style={[styles.section, FONTS.display.semibold, { color: theme.text }]}>Ta journée peut encore être optimisée</Text>
      <Card>
        <View style={styles.summary}><SummaryItem label="Calories restantes" value={formatRemaining(plan.remaining.kcal, 'kcal')} theme={theme} /><SummaryItem label="Protéines restantes" value={formatRemaining(plan.remaining.protein, 'g')} theme={theme} /><SummaryItem label="Glucides restants" value={formatRemaining(plan.remaining.carbs, 'g')} theme={theme} /><SummaryItem label="Lipides restants" value={formatRemaining(plan.remaining.fat, 'g')} theme={theme} /></View>
        {priorities.length ? <View style={[styles.priorityBlock, { borderTopColor: theme.border }]}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 13 }]}>Priorités détectées</Text>{priorities.map((priority) => <View key={priority.key} style={styles.priorityRow}><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, flex: 1 }]}>{priority.label}</Text><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 13 }]}>{priority.percent}%</Text></View>)}</View> : <View style={[styles.focus, { borderTopColor: theme.border }]}><Icon name="checkmark.circle.fill" android="checkmark-circle" size={17} color={theme.success} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 13, flex: 1 }]}>Aucun manque mesurable prioritaire pour le moment.</Text></View>}
      </Card>
      <Text style={[styles.section, FONTS.display.semibold, { color: theme.text }]}>Pour compléter ta journée</Text>
      {plan.suggestions.length ? plan.suggestions.map((suggestion) => <SuggestionCard key={suggestion.food.id} suggestion={suggestion} onOpen={() => onOpenFood(suggestion.food)} />) : <Card><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, lineHeight: 20 }]}>Ajoute un aliment au journal, ou libère quelques calories restantes, pour recevoir des propositions adaptées.</Text></Card>}
      <View style={[styles.note, { backgroundColor: theme.cardAlt }]}><Icon name="info.circle" android="information-circle" size={17} color={theme.sub} /><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, lineHeight: 17, flex: 1 }]}>Les recommandations utilisent uniquement les valeurs disponibles, tes objectifs et les aliments déjà enregistrés. Elles sont informatives et ne constituent pas un avis médical.</Text></View>
    </ScrollView>
  </View>;
}

function formatRemaining(value: number | undefined, unit: string): string { return value === undefined ? 'Donnée indisponible' : `${Math.round(value)} ${unit}`; }
function SummaryItem({ label, value, theme }: { label: string; value: string; theme: { text: string; sub: string } }) { return <View style={styles.summaryItem}><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 15 }]}>{value}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11, marginTop: 3 }]}>{label}</Text></View>; }
function SuggestionCard({ suggestion, onOpen }: { suggestion: OptimizerSuggestion; onOpen: () => void }) {
  const { theme } = useTheme();
  return <Card style={{ marginBottom: 12 }}><View style={styles.suggestionHead}><View style={[styles.foodIcon, { backgroundColor: theme.primarySoft }]}><Icon name="leaf.fill" android="leaf" size={20} color={theme.primary} /></View><View style={{ flex: 1 }}><Text numberOfLines={2} style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>{suggestion.food.name}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2 }]}>{suggestion.food.portionLabel}</Text></View></View><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, lineHeight: 18, marginTop: 12 }]}>Apporte notamment :</Text>{suggestion.impacts.map((impact) => <View key={impact.key} style={styles.impactRow}><Text style={[FONTS.text.regular, { color: theme.text, fontSize: 13, flex: 1 }]}>{impact.label}</Text><Text style={[FONTS.mono.semibold, { color: theme.primary, fontSize: 12 }]}>+{formatNutrientValue(impact.amount, impact.unit)} ({impact.percentTarget < 10 ? Math.round(impact.percentTarget * 10) / 10 : Math.round(impact.percentTarget)}% du restant)</Text></View>)}<View style={[styles.nutrients, { borderTopColor: theme.border }]}><Text style={[FONTS.mono.semibold, { color: theme.text, fontSize: 12 }]}>{Math.round(suggestion.nutrition.kcal || 0)} kcal</Text><Text style={[FONTS.mono.regular, { color: theme.sub, fontSize: 12 }]}>{Math.round(suggestion.nutrition.protein || 0)} g prot.</Text><Text style={[FONTS.mono.regular, { color: theme.sub, fontSize: 12 }]}>{Math.round(suggestion.nutrition.carbs || 0)} g gluc.</Text><Text style={[FONTS.mono.regular, { color: theme.sub, fontSize: 12 }]}>{Math.round(suggestion.nutrition.fat || 0)} g lip.</Text></View><View style={{ marginTop: 14 }}><PrimaryButton label="Voir cet aliment" onPress={onOpen} /></View></Card>;
}
const styles = StyleSheet.create({ back: { flexDirection: 'row', alignItems: 'center', gap: 4 }, hero: { padding: 24, alignItems: 'center' }, section: { fontSize: 20, letterSpacing: -0.3, marginTop: 24, marginBottom: 11 }, summary: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 }, summaryItem: { width: '50%' }, priorityBlock: { borderTopWidth: 1, marginTop: 17, paddingTop: 14 }, priorityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9 }, focus: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, marginTop: 17, paddingTop: 14 }, suggestionHead: { flexDirection: 'row', alignItems: 'center', gap: 11 }, foodIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, impactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, nutrients: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, marginTop: 13, paddingTop: 12 }, note: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 15, borderRadius: 16, marginTop: 12 } });
