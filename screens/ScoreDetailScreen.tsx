import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from '../components/I18nText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { useStore } from '../lib/store';
import { ProgressBar } from '../components/ui';
import { scoreTotalsForEntries, todayKey } from '../lib/nutrition';
import { hydrationTargetForDay } from '../lib/healthTargets';
import { calculateDailyNutritionTargets, targetsWithDynamicMacros } from '../lib/energy';
import { computeDayScore } from '../lib/scoring';

export default function ScoreDetailScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { entriesForDate, habitsForDate, profile } = useStore();
  const date = todayKey();
  const entries = entriesForDate(date);
  const habits = habitsForDate(date);
  const totals = useMemo(() => scoreTotalsForEntries(entries), [entries]);
  const dailyTargets = useMemo(() => calculateDailyNutritionTargets(profile, habits, totals), [profile, habits, totals]);
  const energy = dailyTargets.energy;
  const targets = useMemo(() => ({ ...targetsWithDynamicMacros(profile, dailyTargets.macros), waterMl: hydrationTargetForDay(profile, habits) }), [profile, dailyTargets.macros, habits]);
  const score = useMemo(() => computeDayScore(totals, habits, targets), [totals, habits, targets]);
  const positives = score.pillars.filter((pillar) => pillar.available && pillar.positive).slice(0, 3);
  const negatives = score.pillars.filter((pillar) => pillar.available && pillar.negative).sort((a, b) => a.score - b.score).slice(0, 3);
  const actions = score.pillars.filter((pillar) => pillar.available && pillar.action).sort((a, b) => a.score - b.score).slice(0, 3);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}><Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}><Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>Retour</Text></Pressable></View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16), paddingTop: 12 }}>
      <View style={{ overflow: 'hidden', borderRadius: 24, marginBottom: 16 }}><LinearGradient colors={[theme.heroGradient[0], theme.heroGradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}><Text style={[FONTS.text.semibold, { color: 'rgba(255,255,255,0.85)', fontSize: 14 }]}>Ta Note santé aujourd’hui</Text><Text style={[FONTS.display.bold, { color: '#FFFFFF', fontSize: 64, letterSpacing: -1.5 }]}>{score.score}<Text style={[FONTS.text.semibold, { color: 'rgba(255,255,255,0.8)', fontSize: 18 }]}> /100</Text></Text><Text style={[FONTS.text.semibold, { color: '#FFFFFF', fontSize: 18 }]}>{score.label}</Text><Text style={[FONTS.text.regular, { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 8 }]}>Données suivies : {score.coverage}% des pondérations</Text></LinearGradient></View>
      <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, lineHeight: 20, marginBottom: 16, textAlign: 'center' }]}>Ce score est un indicateur personnel de tes habitudes du jour. Il n’est pas un diagnostic médical : il t’aide à visualiser où tu en es et quoi améliorer.</Text>
      <Text style={[FONTS.display.semibold, { color: theme.text, fontSize: 20, marginBottom: 12 }]}>Décomposition par pilier</Text>
      {score.pillars.map((pillar) => {
        const color = !pillar.available ? theme.sub : pillar.score >= 85 ? theme.success : pillar.score >= 60 ? theme.warn : theme.danger;
        return <View key={pillar.key} style={{ marginBottom: 12 }}><View style={[styles.pillarCard, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.pillarHead}><View style={[styles.pillarIcon, { backgroundColor: `${color}22` }]}><Icon name={pillar.icon as any} android={pillar.androidIcon as any} size={18} color={color} /></View><View style={{ flex: 1 }}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>{pillar.label}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13 }]}>{pillar.detail}</Text></View><Text style={[FONTS.mono.semibold, { color, fontSize: 18 }]}>{pillar.available ? pillar.score : '—'}</Text></View>{pillar.available ? <View style={{ marginTop: 10 }}><ProgressBar value={pillar.score} color={color} height={6} /></View> : null}</View></View>;
      })}
      <InsightCard title="Ce qui améliore ta note" color={theme.success} background={theme.successSoft} icon="checkmark.circle.fill" android="checkmark-circle" items={positives.map((pillar) => `${pillar.label} · ${pillar.score}/100`)} theme={theme} />
      <InsightCard title="Ce qui la fait diminuer" color={theme.warn} background={theme.accentSoft} icon="exclamationmark.triangle.fill" android="warning" items={negatives.map((pillar) => `${pillar.label} · ${pillar.detail}`)} theme={theme} />
      <View style={[styles.actionCard, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Tes prochaines actions</Text>{actions.length ? actions.map((pillar, index) => <View key={pillar.key} style={styles.actionRow}><View style={[styles.actionIndex, { backgroundColor: theme.primarySoft }]}><Text style={[FONTS.mono.semibold, { color: theme.primary, fontSize: 12 }]}>{index + 1}</Text></View><Text style={[FONTS.text.regular, { color: theme.text, fontSize: 13, lineHeight: 18, flex: 1 }]}>{pillar.action}</Text></View>) : <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, marginTop: 8 }]}>Continue à renseigner ta journée pour obtenir une action personnalisée.</Text>}</View>
      <View style={[styles.noteBox, { backgroundColor: theme.accentSoft, borderColor: `${theme.accent}40` }]}><Icon name="info.circle" android="information-circle" size={18} color={theme.accent} /><Text style={[FONTS.text.regular, { color: theme.text, fontSize: 13, flex: 1, lineHeight: 18 }]}>Les données non renseignées restent neutres et ne font pas baisser la note. Les 7 piliers sont pondérés : nutrition (20 %), micros (20 %), macros (15 %), activité (15 %), hydratation (12,5 %), sommeil (12,5 %), extérieur (5 %).</Text></View>
    </ScrollView>
  </View>;
}

function InsightCard({ title, color, background, icon, android, items, theme }: { title: string; color: string; background: string; icon: string; android: string; items: string[]; theme: { text: string; sub: string } }) {
  return <View style={[styles.insightCard, { backgroundColor: background }]}><View style={styles.insightTitle}><Icon name={icon} android={android} size={17} color={color} /><Text style={[FONTS.text.semibold, { color, fontSize: 15 }]}>{title}</Text></View>{items.length ? items.map((item) => <Text key={item} style={[FONTS.text.regular, { color: theme.text, fontSize: 13, marginTop: 7 }]}>{item}</Text>) : <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, marginTop: 7 }]}>Aucun point identifié avec les données saisies.</Text>}</View>;
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hero: { padding: 24, alignItems: 'center' },
  pillarCard: { borderRadius: 18, padding: 16, borderWidth: 1 },
  pillarHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pillarIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  insightCard: { borderRadius: 18, padding: 16, marginBottom: 10 },
  insightTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  actionIndex: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteBox: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 12, alignItems: 'flex-start' },
});
