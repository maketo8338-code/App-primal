import React, { useMemo } from 'react';
import { Image, StyleSheet, Text as NativeText, View } from 'react-native';
import { NeonScrollView as ScrollView } from '../components/NeonScroll';
import { I18nText as Text } from '../components/I18nText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glow, MOTION, RADIUS, shadow, useTheme } from '../lib/theme';
import { FadeInUp, Float, Pressable3D } from '../components/motion';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { FONTS } from '../lib/fonts';
import { Icon } from '../components/Icon';
import { useAppIcon } from '../lib/appAssets';
import { ProgressBar } from '../components/ui';
import { CompactStat, IconBadge, ProgressRing, SectionHeading, Surface } from '../components/PrimalVisuals';
import { completeTotalForEntries, micronutrientStatuses, pct, scoreTotalsForEntries, shiftDate, todayKey } from '../lib/nutrition';
import { AdviceCard } from '../components/AdviceCard';
import CoachCard from '../components/CoachCard';
import type { Food } from '../types';
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
  /** Opens the « Ma journée » share card. */
  onShareDay?: () => void;
  /** Opens a food card (used by the coach suggestions). */
  onOpenFood?: (food: Food) => void;
}
interface HabitMetric { label: string; value: string; icon: string; android: string; color: string; soft: string; onPress: () => void; }

export default function HomeScreen(props: Props) {
  const { theme } = useTheme(); const appIcon = useAppIcon();
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
    <FadeInUp style={styles.header}>
      <View style={styles.brandRow}><View style={[styles.appIconWrap, shadow(theme, 1)]}><Image source={appIcon} style={styles.appIcon} /></View><View><Text style={[FONTS.text.bold, styles.brand, { color: theme.deep }]}>PRIMAL</Text><Text style={[FONTS.text.regular, styles.brandSub, { color: theme.sub }]}>{t('home.tagline')}</Text></View><Pressable3D onPress={props.onOpenStats} tilt={0} sink={0.92} style={[styles.headerAction, { backgroundColor: theme.card, borderColor: theme.outline }]}><Icon name="chart.bar.fill" android="bar-chart" size={18} color={theme.primary} /></Pressable3D></View>
      <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>{t('home.greeting')}{profile.firstName ? ` ${profile.firstName}` : ''}</Text>
      <Text style={[FONTS.text.regular, styles.subtitle, { color: theme.sub }]}>{t('home.subtitle')}</Text>
    </FadeInUp>

    <View style={styles.content}>
      <FadeInUp delay={MOTION.stagger}><View style={[styles.heroShadow, { backgroundColor: theme.heroGradient[0] }, glow(theme.neon, 0.55)]}><LinearGradient colors={theme.heroGradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, { borderColor: theme.outline }]}>
        <View style={[styles.heroGlow, { backgroundColor: theme.neon }]} /><View style={styles.heroTop}><View style={styles.heroBadge}><Icon name="flame.fill" android="flame" size={18} color="#FFFFFF" /></View><Text style={[FONTS.text.bold, styles.heroEyebrow]}>{t('home.currentDay')}</Text><Text style={[FONTS.display.semibold, styles.heroTitle]}>{t('home.energy')}</Text><Text style={[FONTS.text.regular, styles.heroHint]}>{t('home.energyHint')}</Text></View>
        <View style={styles.heroMain}><Float amplitude={4} rotate={1.2} style={[{ borderRadius: 69, backgroundColor: 'rgba(20,4,6,0.55)' }, glow(theme.neon, 0.7)]}><ProgressRing value={pct(consumed, targets.kcal)} size={138} stroke={11} color="#FFFFFF" trackColor="#FFFFFF" fill="rgba(255,255,255,0.06)"><View style={styles.ringCenter}><Text style={[FONTS.display.bold, styles.ringValue]}>{consumed === undefined ? '—' : Math.round(consumed).toLocaleString('fr-FR')}</Text><Text style={[FONTS.text.semibold, styles.ringUnit]}>kcal</Text></View></ProgressRing></Float><View style={styles.heroCopy}><Text style={[FONTS.text.regular, styles.heroLabel]}>{t('home.dailyTarget')}</Text><Text style={[FONTS.display.semibold, styles.heroTarget]}>{targets.kcal.toLocaleString('fr-FR')} kcal</Text><Text style={[FONTS.text.regular, styles.heroRemaining]}>{remaining === undefined ? 'Donnée indisponible' : remaining > 0 ? `${remaining.toLocaleString('fr-FR')} kcal restantes` : 'Objectif atteint'}</Text></View></View>
        <View style={styles.heroFooter}><Text style={[FONTS.text.regular, styles.heroMeta]}>Dépense estimée {energy.tdee.toLocaleString('fr-FR')} kcal</Text><Text style={[FONTS.text.regular, styles.heroMeta]}>{energy.basisLabel}</Text></View>
      </LinearGradient></View></FadeInUp>

      {props.onOpenFood ? <FadeInUp delay={MOTION.stagger * 1.5}><CoachCard entries={entries} targets={targets} onOpenFood={props.onOpenFood} onOpenDetail={props.onOptimizeDay} /></FadeInUp> : null}

      <FadeInUp delay={MOTION.stagger * 2} style={styles.scoreRow}><Surface onPress={props.onOpenScore} style={styles.scoreCard}><View style={[styles.scoreCircle, { borderColor: scoreColor, backgroundColor: theme.cardAlt }]}><Text style={[FONTS.mono.bold, { color: scoreColor, fontSize: 19 }]}>{score.score}</Text><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 10 }]}>/100</Text></View><View style={{ flex: 1 }}><Text style={[FONTS.display.semibold, { color: theme.text, fontSize: 17 }]}>PRIMAL Score</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 3 }]}>{score.label} · {trend}</Text></View><Icon name="chevron.right" android="chevron-forward" size={15} color={theme.sub} /></Surface><Surface onPress={props.onOptimizeDay} style={[styles.optimizeCard, { backgroundColor: theme.accentSoft, borderColor: theme.accentSoft }]}><IconBadge name="sparkles" android="sparkles" size={36} color={theme.accent} backgroundColor={theme.cardSolid} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 13, lineHeight: 17, marginTop: 9 }]}>Optimiser{`\n`}ma journée</Text></Surface></FadeInUp>

      {props.onShareDay ? <FadeInUp delay={MOTION.stagger * 2}><Pressable3D accessibilityLabel="Partager ma journée" onPress={props.onShareDay} tilt={8} sink={0.97} style={[styles.shareButton, { borderColor: theme.outline, backgroundColor: theme.card }]}><View style={[styles.shareIcon, { backgroundColor: theme.primarySoft }]}><Icon name="square.and.arrow.up" android="share-social" size={18} color={theme.primary} /></View><View style={{ flex: 1 }}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Partager ma journée</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2 }]}>Une image de ton score à envoyer à tes amis</Text></View><Icon name="chevron.right" android="chevron-forward" size={16} color={theme.sub} /></Pressable3D></FadeInUp> : null}

      <FadeInUp delay={MOTION.stagger * 3}><SectionHeading title="Ton rythme" eyebrow="SANTÉ AU QUOTIDIEN" />
      <View style={styles.grid}>{habitsMetrics.map((item) => <CompactStat key={item.label} {...item} />)}</View></FadeInUp>

      <FadeInUp delay={MOTION.stagger * 4}><SectionHeading title="Équilibre nutritionnel" eyebrow="MACROS" action="Voir le journal" onAction={props.onOpenJournal} />
      <View style={styles.macroGrid}>{macros.map((macro) => <Surface key={macro.label} style={styles.macroCard}><IconBadge name={macro.icon} android={macro.android} color={macro.color} backgroundColor={macro.soft} size={34} /><Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 12, marginTop: 11 }]}>{macro.label}</Text><Text style={[FONTS.mono.bold, { color: theme.text, fontSize: 17, marginTop: 4 }]}>{Math.round(macro.value ?? 0)}<Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12 }]}> / {macro.target} g</Text></Text><View style={{ marginTop: 10 }}><ProgressBar value={pct(macro.value, macro.target)} color={macro.color} height={7} /></View></Surface>)}</View></FadeInUp>

      <FadeInUp delay={MOTION.stagger * 5}><SectionHeading title="À surveiller" eyebrow="MICRONUTRIMENTS" action="Tout voir" onAction={props.onOpenMicros} />
      <Surface onPress={props.onOpenMicros} style={styles.attentionCard}>{attention.length ? attention.map((item, index) => { const color = (item.percent ?? 0) >= 85 ? theme.success : (item.percent ?? 0) >= 60 ? theme.warn : theme.danger; return <View key={item.key} style={[styles.attentionRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}><View style={[styles.attentionDot, { backgroundColor: color, shadowColor: color }]} /><Text style={[FONTS.text.semibold, { color: theme.text, flex: 1, fontSize: 14 }]}>{item.label}</Text><Text style={[FONTS.mono.semibold, { color, fontSize: 13 }]}>{item.percent}%</Text><Icon name="chevron.right" android="chevron-forward" size={14} color={theme.sub} /></View>; }) : <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, lineHeight: 20 }]}>Aucune donnée micronutritionnelle exploitable pour le moment.</Text>}</Surface></FadeInUp>

      <FadeInUp delay={MOTION.stagger * 6}><AdviceCard advice={advice} /></FadeInUp>

      <FadeInUp delay={MOTION.stagger * 7} style={{ gap: 20 }}><Surface onPress={props.onOpenJournal} style={styles.journalCard}><IconBadge name="calendar" android="calendar" color={theme.primary} backgroundColor={theme.primarySoft} size={40} /><View style={{ flex: 1 }}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>{entries.length ? `${entries.length} aliment${entries.length > 1 ? 's' : ''} enregistré${entries.length > 1 ? 's' : ''}` : 'Ton journal est prêt'}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 3 }]}>{trend} cette semaine · ouvre le suivi</Text></View><Icon name="chevron.right" android="chevron-forward" size={18} color={theme.sub} /></Surface>
      <Pressable3D onPress={props.onAddFood} tilt={10} sink={0.97} style={[styles.cta, { backgroundColor: theme.primary }, shadow(theme, 2, theme.primary)]}><LinearGradient colors={theme.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} /><Icon name="plus" android="add" size={20} color={theme.onPrimary} /><Text style={[FONTS.text.semibold, { color: theme.onPrimary, fontSize: 16 }]}>Ajouter un aliment</Text></Pressable3D></FadeInUp>
    </View>
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 28 }, header: { paddingHorizontal: 20 }, brandRow: { flexDirection: 'row', alignItems: 'center' }, appIconWrap: { borderRadius: 12, marginRight: 10 }, appIcon: { width: 36, height: 36, borderRadius: 12 }, brand: { fontSize: 14, letterSpacing: 2.6 }, brandSub: { fontSize: 9, letterSpacing: 1.1, marginTop: 2 }, headerAction: { width: 42, height: 42, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }, title: { fontSize: 33, letterSpacing: -0.6, marginTop: 20 }, subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6 }, content: { paddingHorizontal: 16, marginTop: 22, gap: 22 },
  heroShadow: { borderRadius: RADIUS.xl },
  hero: { minHeight: 300, borderRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: 21, paddingTop: 22, paddingBottom: 19, overflow: 'hidden' }, heroGlow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -120, top: -170, opacity: 0.16 }, heroTop: { alignItems: 'center' }, heroEyebrow: { color: 'rgba(255,255,255,0.78)', fontSize: 11, letterSpacing: 1.6, marginTop: 10, textTransform: 'uppercase' }, heroTitle: { color: '#FFFFFF', fontSize: 28, letterSpacing: -0.3, marginTop: 4, textAlign: 'center' }, heroHint: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 3, textAlign: 'center' }, heroBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' }, heroMain: { flexDirection: 'row', alignItems: 'center', gap: 21, marginTop: 20 }, ringCenter: { width: 98, minHeight: 68, paddingHorizontal: 5, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,8,10,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }, ringValue: { color: '#FFFFFF', fontSize: 30, letterSpacing: -0.6 }, ringUnit: { color: 'rgba(255,255,255,0.86)', fontSize: 12, marginTop: -1 }, heroCopy: { flex: 1 }, heroLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13 }, heroTarget: { color: '#FFFFFF', fontSize: 23, letterSpacing: -0.3, marginTop: 4 }, heroRemaining: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 18, marginTop: 7 }, heroFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', marginTop: 19, paddingTop: 12 }, heroMeta: { color: 'rgba(255,255,255,0.78)', fontSize: 12 },
  scoreRow: { flexDirection: 'row', gap: 12 }, shareButton: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 14 }, shareIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, scoreCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 90 }, scoreCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, optimizeCard: { width: 120, padding: 13, minHeight: 90 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, macroGrid: { flexDirection: 'row', gap: 8 }, macroCard: { flex: 1, minWidth: 0, minHeight: 146, padding: 11 }, attentionCard: { paddingVertical: 7 }, attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 }, attentionDot: { width: 10, height: 10, borderRadius: 5, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }, adviceCard: { padding: 16 }, adviceTitle: { flexDirection: 'row', alignItems: 'center', gap: 11 }, journalCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cta: { minHeight: 58, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
