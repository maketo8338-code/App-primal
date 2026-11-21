import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from '../components/I18nText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { APP_ICON } from '../zzz/appAssets';
import { ProgressBar } from '../components/ui';
import { CompactStat, IconBadge, ProgressRing, SectionHeading, Surface } from '../components/PrimalVisuals';
import { completeTotalForEntries, micronutrientStatuses, pct, scoreTotalsForEntries, shiftDate, todayKey } from '../lib/nutrition';
import { AdviceCard } from '../components/AdviceCard';
import { nutritionAdvice } from '../lib/advice';
import { computeDayScore } from '../lib/scoring';
import { activityDuration, knownActiveCalories } from '../lib/activitySync';
import { formatSleepDuration } from '../lib/sleepSync';
import { hydrationTargetForDay, totalHydrationMl, waterFromEntries } from '../lib/healthTargets';
import { calculateDailyNutritionTargets, targetsWithDynamicMacros } from '../lib/energy';

interface Props {
  onAddFood: () => void; onOpenJournal: () => void; onOpenMicros: () => void; onOpenScore: () => void;
  onOpenHydration: () => void; onOpenActivity: () => void; onOpenSleep: () => void; onOpenOutdoor: () => void;
  onOpenStats: () => void; onOptimizeDay: () => void;
}
interface HabitMetric { label: string; value: string; icon: string; android: string; color: string; soft: string; onPress: () => void; }

export default function HomeScreen(props: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { profile, entriesForDate, habitsForDate } = useStore();
  const entries = entriesForDate(todayKey());
  const totals = useMemo(() => scoreTotalsForEntries(entries), [entries]);
  const habits = habitsForDate(todayKey());
  const dailyTargets = useMemo(() => calculateDailyNutritionTargets(profile, habits, totals), [profile, habits, totals]);
  const energy = dailyTargets.energy;
  const targets = { ...targetsWithDynamicMacros(profile, dailyTargets.macros), waterMl: hydrationTargetForDay(profile, habits) };
  const consumed = completeTotalForEntries(entries, 'kcal');
  const consumedProtein = completeTotalForEntries(entries, 'protein') ?? 0;
  const consumedCarbs = completeTotalForEntries(entries, 'carbs') ?? 0;
  const consumedFat = completeTotalForEntries(entries, 'fat') ?? 0;
  const remaining = consumed === undefined ? undefined : Math.max(0, energy.targetCalories - consumed);
  const hydrationTotal = totalHydrationMl(habits.waterMl, waterFromEntries(entries));
  const score = useMemo(() => computeDayScore(totals, habits, targets), [totals, habits, targets]);
  const scoreColor = score.coverage === 0 ? theme.sub : score.score >= 75 ? theme.success : score.score >= 40 ? theme.warn : theme.danger;
  const attention = useMemo(() => micronutrientStatuses(entries, profile).filter((item) => item.available && item.complete && item.percent !== undefined).sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0)).slice(0, 3), [entries, profile]);
  const advice = useMemo(() => nutritionAdvice(entries, { targets, hydrationTotal, limit: 4 }), [entries, targets.kcal, targets.protein, targets.carbs, targets.fat, targets.waterMl, hydrationTotal]);
  const weekTrend = useMemo(() => {
    const scores = Array.from({ length: 7 }, (_, index) => {
      const date = shiftDate(todayKey(), index - 6);
      const dayEntries = entriesForDate(date);
      const dayTotals = scoreTotalsForEntries(dayEntries);
      const dayHabits = habitsForDate(date);
      const dayTargetsData = calculateDailyNutritionTargets(profile, dayHabits, dayTotals);
       const dayTargets = { ...targetsWithDynamicMacros(profile, dayTargetsData.macros), waterMl: hydrationTargetForDay(profile, dayHabits) };
      return computeDayScore(dayTotals, dayHabits, dayTargets).score;
    });
    return { start: scores[0], end: scores[6] };
  }, [entriesForDate, habitsForDate, profile]);
  const trend = weekTrend.end > weekTrend.start ? 'en hausse' : weekTrend.end < weekTrend.start ? 'en baisse' : 'stable';
  const macros = [
    { label: t('home.protein'), value: consumedProtein, target: targets.protein, color: theme.primary, soft: theme.primarySoft, icon: 'bolt.fill', android: 'flash' },
    { label: 'Glucides', value: consumedCarbs, target: targets.carbs, color: theme.accent, soft: theme.accentSoft, icon: 'leaf.fill', android: 'leaf' },
    { label: 'Lipides', value: consumedFat, target: targets.fat, color: theme.success, soft: theme.successSoft, icon: 'drop.fill', android: 'water' },
  ];
  const habitsMetrics: HabitMetric[] = [
    { label: 'Hydratation', value: habits.waterEntries.length || hydrationTotal > 0 ? `${(hydrationTotal / 1000).toFixed(1)} / ${(targets.waterMl / 1000).toFixed(1)} L` : 'Indisponible', icon: 'drop.fill', android: 'water', color: theme.primary, soft: theme.primarySoft, onPress: props.onOpenHydration },
    { label: 'Activité', value: habits.steps > 0 || habits.activities.length > 0 ? `${habits.steps.toLocaleString('fr-FR')} pas` : 'Indisponible', icon: 'bolt.fill', android: 'flash', color: theme.aqua, soft: theme.aquaSoft, onPress: props.onOpenActivity },
    { label: 'Sommeil', value: habits.sleepH > 0 ? `${formatSleepDuration(habits.sleepH)} / ${formatSleepDuration(targets.sleepH)}` : 'Indisponible', icon: 'moon.fill', android: 'moon', color: theme.primary, soft: theme.primarySoft, onPress: props.onOpenSleep },
    { label: 'Extérieur', value: habits.outdoorMin > 0 ? `${habits.outdoorMin} / ${targets.outdoorMin} min` : 'Indisponible', icon: 'sun.max.fill', android: 'sunny', color: theme.accent, soft: theme.accentSoft, onPress: props.onOpenOutdoor },
  ];

  return <View style={{ flex: 1, backgroundColor: 'transparent' }}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}>
    <View style={styles.header}>
      <View style={styles.brandRow}><Image source={APP_ICON} style={styles.appIcon} /><View><Text style={[FONTS.text.bold, styles.brand, { color: theme.text }]}>PRIMAL</Text><Text style={[FONTS.text.regular, styles.brandSub, { color: theme.sub }]}>{t('home.tagline')}</Text></View><Pressable onPress={props.onOpenStats} style={({ pressed }) => [styles.headerAction, { backgroundColor: theme.card, borderColor: theme.border }, pressed && styles.pressed]}><Icon name="chart.bar.fill" android="bar-chart" size={18} color={theme.primary} /></Pressable></View>
      <Text style={[FONTS.display.bold, styles.title, { color: theme.text }]}>{t('home.greeting')}{profile.firstName ? ` ${profile.firstName}` : ''}</Text>
      <Text style={[FONTS.text.regular, styles.subtitle, { color: theme.sub }]}>{t('home.subtitle')}</Text>
    </View>

    <View style={styles.content}>
      <LinearGradient colors={theme.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroGlow} /><View style={styles.heroTop}><View><Text style={[FONTS.text.semibold, styles.heroEyebrow]}>{t('home.currentDay')}</Text><Text style={[FONTS.display.semibold, styles.heroTitle]}>{t('home.energy')}</Text><Text style={[FONTS.text.regular, styles.heroHint]}>{t('home.energyHint')}</Text></View><View style={styles.heroBadge}><Icon name="flame.fill" android="flame" size={18} color="#FFFFFF" /></View></View>
        <View style={styles.heroMain}><ProgressRing value={pct(consumed, targets.kcal)} size={138} stroke={11} color="#FFFFFF" trackColor="#FFFFFF" ><View style={styles.ringCenter}><Text style={[FONTS.display.bold, styles.ringValue]}>{consumed === undefined ? '—' : Math.round(consumed).toLocaleString('fr-FR')}</Text><Text style={[FONTS.text.semibold, styles.ringUnit]}>kcal</Text></View></ProgressRing><View style={styles.heroCopy}><Text style={[FONTS.text.regular, styles.heroLabel]}>{t('home.dailyTarget')}</Text><Text style={[FONTS.display.semibold, styles.heroTarget]}>{targets.kcal.toLocaleString('fr-FR')} kcal</Text><Text style={[FONTS.text.regular, styles.heroRemaining]}>{remaining === undefined ? 'Donnée indisponible' : remaining > 0 ? `${remaining.toLocaleString('fr-FR')} kcal restantes` : 'Objectif atteint'}</Text></View></View>
        <View style={styles.heroFooter}><Text style={[FONTS.text.regular, styles.heroMeta]}>Dépense estimée {energy.tdee.toLocaleString('fr-FR')} kcal</Text><Text style={[FONTS.text.regular, styles.heroMeta]}>{energy.basisLabel}</Text></View>
      </LinearGradient>

      <View style={styles.scoreRow}><Surface onPress={props.onOpenScore} style={styles.scoreCard}><View style={[styles.scoreCircle, { borderColor: scoreColor }]}><Text style={[FONTS.mono.bold, { color: scoreColor, fontSize: 19 }]}>{score.score}</Text><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 9 }]}>/100</Text></View><View style={{ flex: 1 }}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>PRIMAL Score</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 3 }]}>{score.label} · {trend}</Text></View><Icon name="chevron.right" android="chevron-forward" size={15} color={theme.sub} /></Surface><Surface onPress={props.onOptimizeDay} style={[styles.optimizeCard, { backgroundColor: theme.accentSoft, borderColor: theme.accentSoft }]}><IconBadge name="sparkles" android="sparkles" size={34} color={theme.accent} backgroundColor={theme.card} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 13, lineHeight: 17, marginTop: 9 }]}>Optimiser{`\n`}ma journée</Text></Surface></View>

      <SectionHeading title="Ton rythme" eyebrow="SANTÉ AU QUOTIDIEN" />
      <View style={styles.grid}>{habitsMetrics.map((item) => <CompactStat key={item.label} {...item} />)}</View>

      <SectionHeading title="Équilibre nutritionnel" eyebrow="MACROS" action="Voir le journal" onAction={props.onOpenJournal} />
      <View style={styles.macroGrid}>{macros.map((macro) => <Surface key={macro.label} style={styles.macroCard}><IconBadge name={macro.icon} android={macro.android} color={macro.color} backgroundColor={macro.soft} size={32} /><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 11, marginTop: 11 }]}>{macro.label}</Text><Text style={[FONTS.mono.bold, { color: theme.text, fontSize: 17, marginTop: 4 }]}>{Math.round(macro.value ?? 0)}<Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11 }]}> / {macro.target} g</Text></Text><View style={{ marginTop: 10 }}><ProgressBar value={pct(macro.value, macro.target)} color={macro.color} height={6} /></View></Surface>)}</View>

      <SectionHeading title="À surveiller" eyebrow="MICRONUTRIMENTS" action="Tout voir" onAction={props.onOpenMicros} />
      <Surface onPress={props.onOpenMicros} style={styles.attentionCard}>{attention.length ? attention.map((item, index) => { const color = (item.percent ?? 0) >= 85 ? theme.success : (item.percent ?? 0) >= 60 ? theme.warn : theme.danger; return <View key={item.key} style={[styles.attentionRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}><View style={[styles.attentionDot, { backgroundColor: color }]} /><Text style={[FONTS.text.semibold, { color: theme.text, flex: 1, fontSize: 14 }]}>{item.label}</Text><Text style={[FONTS.mono.semibold, { color, fontSize: 13 }]}>{item.percent}%</Text><Icon name="chevron.right" android="chevron-forward" size={14} color={theme.sub} /></View>; }) : <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, lineHeight: 20 }]}>Aucune donnée micronutritionnelle exploitable pour le moment.</Text>}</Surface>

      <AdviceCard advice={advice} />

      <Surface onPress={props.onOpenJournal} style={styles.journalCard}><IconBadge name="calendar" android="calendar" color={theme.primary} backgroundColor={theme.primarySoft} size={38} /><View style={{ flex: 1 }}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>{entries.length ? `${entries.length} aliment${entries.length > 1 ? 's' : ''} enregistré${entries.length > 1 ? 's' : ''}` : 'Ton journal est prêt'}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 3 }]}>{trend} cette semaine · ouvre le suivi</Text></View><Icon name="chevron.right" android="chevron-forward" size={18} color={theme.sub} /></Surface>
      <Pressable onPress={props.onAddFood} style={({ pressed }) => [styles.cta, { backgroundColor: theme.primary }, pressed && styles.ctaPressed]}><Icon name="plus" android="add" size={20} color="#FFFFFF" /><Text style={[FONTS.text.semibold, { color: '#FFFFFF', fontSize: 16 }]}>Ajouter un aliment</Text></Pressable>
    </View>
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 28 }, header: { paddingHorizontal: 20 }, brandRow: { flexDirection: 'row', alignItems: 'center' }, appIcon: { width: 34, height: 34, borderRadius: 11, marginRight: 10 }, brand: { fontSize: 14, letterSpacing: 2.1 }, brandSub: { fontSize: 8, letterSpacing: 1.05, marginTop: 2 }, headerAction: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }, title: { fontSize: 31, letterSpacing: -0.9, marginTop: 19 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5 }, content: { paddingHorizontal: 16, marginTop: 22, gap: 20 }, hero: { minHeight: 285, borderRadius: 30, padding: 21, overflow: 'hidden' }, heroGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 105, right: -72, top: -86, backgroundColor: '#FFFFFF', opacity: 0.12 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between' }, heroEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, letterSpacing: 1.25 }, heroTitle: { color: '#FFFFFF', fontSize: 25, letterSpacing: -0.4, marginTop: 5 }, heroHint: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 3 }, heroBadge: { width: 39, height: 39, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }, heroMain: { flexDirection: 'row', alignItems: 'center', gap: 21, marginTop: 18 }, ringCenter: { width: 96, minHeight: 66, paddingHorizontal: 5, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,28,52,0.84)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, ringValue: { color: '#FFFFFF', fontSize: 30, letterSpacing: -0.9, textShadowColor: '#000000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }, ringUnit: { color: '#EAF8FF', fontSize: 11, marginTop: -1 }, heroCopy: { flex: 1 }, heroLabel: { color: 'rgba(255,255,255,0.74)', fontSize: 13 }, heroTarget: { color: '#FFFFFF', fontSize: 22, letterSpacing: -0.4, marginTop: 4 }, heroRemaining: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 18, marginTop: 7 }, heroFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', marginTop: 19, paddingTop: 12 }, heroMeta: { color: 'rgba(255,255,255,0.72)', fontSize: 11 }, scoreRow: { flexDirection: 'row', gap: 12 }, scoreCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, minHeight: 88 }, scoreCircle: { width: 55, height: 55, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, optimizeCard: { width: 116, padding: 13, minHeight: 88 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, macroGrid: { flexDirection: 'row', gap: 8 }, macroCard: { flex: 1, minWidth: 0, minHeight: 143, padding: 9 }, attentionCard: { paddingVertical: 7 }, attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 }, attentionDot: { width: 8, height: 8, borderRadius: 4 }, adviceCard: { padding: 16 }, adviceTitle: { flexDirection: 'row', alignItems: 'center', gap: 11 }, journalCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cta: { minHeight: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#2563EB', shadowOpacity: 0.2, shadowRadius: 17, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] }, ctaPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
