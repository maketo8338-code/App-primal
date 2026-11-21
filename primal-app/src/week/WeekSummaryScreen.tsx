import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeonScrollView as ScrollView } from '../components/NeonScroll';
import { I18nText as Text } from '../components/I18nText';
import { Pressable3D } from '../components/motion';
import { Icon } from '../components/Icon';
import { Card } from '../components/ui';
import { IconBadge, SectionHeading } from '../components/PrimalVisuals';
import { useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { todayKey } from '../lib/nutrition';
import { buildWeekSummary } from './weekSummary';

const BAR_HEIGHT = 120;

/** « Bilan de la semaine » : 7 derniers jours, sans jugement, uniquement à partir des données saisies. */
export default function WeekSummaryScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const { entriesForDate, habitsForDate, profile } = useStore();
  const week = useMemo(() => buildWeekSummary(todayKey(), entriesForDate, habitsForDate, profile), [entriesForDate, habitsForDate, profile]);
  const dayName = (date: string, style: 'short' | 'long') => { const s = new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: style }); return s.charAt(0).toUpperCase() + s.slice(1).replace('.', ''); };
  const delta = week.averageScore !== undefined && week.previousAverage !== undefined ? week.averageScore - week.previousAverage : undefined;
  const colorFor = (score: number) => (score >= 75 ? theme.success : score >= 40 ? theme.warn : theme.danger);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable3D onPress={onBack} style={[styles.back, { borderColor: theme.outline, backgroundColor: theme.card }]}>
        <Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} />
        <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>{t('common.back')}</Text>
      </Pressable3D>
      <Text style={[FONTS.text.bold, styles.eyebrow, { color: theme.primary }]}>7 DERNIERS JOURS</Text>
      <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>Bilan de la semaine</Text>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {week.loggedDays === 0 ? <Card><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, lineHeight: 20 }]}>Aucun repas enregistré ces 7 derniers jours. Ton bilan apparaîtra dès ta première journée renseignée.</Text></Card> : <>
        <Card>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 12 }]}>Score moyen</Text>
              <Text style={[FONTS.display.bold, { color: theme.text, fontSize: 44, letterSpacing: -1 }]}>{week.averageScore}<Text style={[FONTS.text.semibold, { color: theme.sub, fontSize: 14 }]}> / 100</Text></Text>
              {delta !== undefined ? <Text style={[FONTS.text.semibold, { color: delta > 0 ? theme.success : delta < 0 ? theme.danger : theme.sub, fontSize: 12 }]}>{delta > 0 ? `+${delta}` : `${delta}`} {t('vs la semaine précédente')}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[FONTS.display.bold, { color: theme.primary, fontSize: 28 }]}>{week.loggedDays}/7</Text>
              <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12 }]}>jours renseignés</Text>
            </View>
          </View>
          <View style={styles.bars}>
            {week.days.map((day) => <View key={day.date} style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                {day.logged ? <View style={[styles.barFill, { height: Math.max(6, (BAR_HEIGHT * day.score) / 100), backgroundColor: colorFor(day.score) }]} /> : null}
              </View>
              <Text style={[FONTS.text.semibold, { color: day.date === week.best?.date ? theme.primary : theme.sub, fontSize: 11, marginTop: 6 }]}>{dayName(day.date, 'short').slice(0, 3)}</Text>
            </View>)}
          </View>
        </Card>

        <SectionHeading title="Tes réussites" eyebrow="POINTS FORTS" />
        <Card>
          {week.best ? <Row icon="star.fill" android="star" title={`${t('Meilleure journée')} : ${dayName(week.best.date, 'long')}`} detail={`${week.best.score} / 100 · ${t(week.best.label)}`} /> : null}
          <Row icon="bolt.fill" android="flash" title={`${t('Protéines atteintes')} : ${week.proteinDays}/7`} detail={t('Jours où tu as atteint au moins 90 % de ta cible.')} />
          <Row icon="drop.fill" android="water" title={`${t('Hydratation atteinte')} : ${week.waterDays}/7`} detail={t('Jours où ta cible d’eau est atteinte.')} last />
        </Card>

        <SectionHeading title="À travailler la semaine prochaine" eyebrow="MANQUES RÉCURRENTS" />
        <Card>
          {week.gaps.length ? week.gaps.map((gap, i) => <Row key={gap.key} icon="leaf.fill" android="leaf" title={t(gap.label)} detail={t('Sous 50 % de la cible {d} jour(s) sur {n} · en moyenne {p} %').replace('{d}', String(gap.days)).replace('{n}', String(week.loggedDays)).replace('{p}', String(gap.averagePercent))} last={i === week.gaps.length - 1} />)
            : <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 13, lineHeight: 19 }]}>Aucun micronutriment n’est resté sous 50 % de sa cible avec les données disponibles.</Text>}
        </Card>
        <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11, lineHeight: 16, marginTop: 10 }]}>Calculé uniquement à partir de ce que tu as enregistré. Les nutriments sans donnée ne sont pas comptés comme des manques. Ce bilan est informatif et ne remplace pas un avis médical.</Text>
      </>}
    </ScrollView>
  </View>;
}

function Row({ icon, android, title, detail, last }: { icon: string; android: string; title: string; detail: string; last?: boolean }) {
  const { theme } = useTheme();
  return <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
    <IconBadge name={icon as never} android={android as never} size={34} color={theme.primary} backgroundColor={theme.primarySoft} />
    <View style={{ flex: 1 }}>
      <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14 }]}>{title}</Text>
      <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }]}>{detail}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingLeft: 8, paddingRight: 14 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, marginTop: 18 },
  title: { fontSize: 30, letterSpacing: -0.5, marginTop: 2 },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
  bars: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { width: 16, height: BAR_HEIGHT, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
