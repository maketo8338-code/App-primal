import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { I18nText as Text } from '../components/I18nText';
import { FONTS } from '../lib/fonts';
import { useTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import type { DaySummary } from './useDaySummary';

/** Logical size of the card (4:5). It is captured at 1080 × 1350 px. */
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 450;

/** Small deterministic random generator: the same day always gets the same embers. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

const RING = 172;
const STROKE = 12;

interface Props { summary: DaySummary; showCalories: boolean }

/**
 * « Ma journée VISOLIS » — the image people share. Drawn with plain views and
 * SVG so it renders the same on screen, in the captured PNG and on the web.
 * Never shows weight or the list of foods.
 */
export const ShareCard = forwardRef<View, Props>(function ShareCard({ summary, showCalories }, ref) {
  const { theme } = useTheme();
  const { locale, formatNumber } = useI18n();
  const [r, g, b] = theme.light.halo;
  const neon = `rgb(${r},${g},${b})`;

  const embers = useMemo(() => {
    const rand = seeded(`${summary.date}-${theme.neon}`);
    return Array.from({ length: 46 }, () => {
      const depth = rand();
      return { x: rand() * CARD_WIDTH, y: rand() * CARD_HEIGHT, r: 3 + depth * 11 * (0.5 + rand() * 0.7), o: 0.18 + depth * 0.5 };
    });
  }, [summary.date, theme.neon]);

  const radius = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = summary.hasData ? Math.max(0, Math.min(100, summary.score)) : 0;
  const rawDate = new Date(`${summary.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const date = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const liters = (ml: number) => (ml / 1000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const stats: Array<{ label: string; value: string; unit: string }> = [
    ...(showCalories ? [{ label: 'Énergie', value: summary.kcal === undefined ? '—' : formatNumber(Math.round(summary.kcal)), unit: 'kcal' }] : []),
    { label: 'Protéines', value: formatNumber(Math.round(summary.protein)), unit: 'g' },
    { label: 'Hydratation', value: liters(summary.waterMl), unit: 'L' },
  ];

  return <View ref={ref} collapsable={false} style={[styles.card, { borderColor: `${theme.primary}40` }]}>
    {/* Background: black, a halo of the chosen colour, and the day's embers. */}
    <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="halo" cx="50%" cy="36%" r="62%">
          <Stop offset="0" stopColor={theme.heroGradient[2]} stopOpacity="0.95" />
          <Stop offset="0.55" stopColor={theme.heroGradient[1]} stopOpacity="0.55" />
          <Stop offset="1" stopColor="#050505" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="ember" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="0.18" stopColor={neon} stopOpacity="0.9" />
          <Stop offset="0.55" stopColor={neon} stopOpacity="0.18" />
          <Stop offset="1" stopColor={neon} stopOpacity="0" />
        </RadialGradient>
        <SvgLinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.55" stopColor="#050505" stopOpacity="0" />
          <Stop offset="1" stopColor="#050505" stopOpacity="0.85" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} fill="#050505" />
      <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#halo)" />
      {embers.map((e, i) => <Circle key={i} cx={e.x} cy={e.y} r={e.r} fill="url(#ember)" opacity={e.o} />)}
      <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#fade)" />
    </Svg>

    <View style={styles.top}>
      <Text style={[FONTS.text.bold, styles.brand, { color: theme.primary }]}>VISOLIS</Text>
      <Text style={[FONTS.text.semibold, styles.date]}>{date}</Text>
    </View>

    <View style={styles.body}>
    <View style={styles.center}>
      <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={theme.primaryGradient[0]} />
              <Stop offset="1" stopColor={theme.primaryGradient[1]} />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke="#FFFFFF" strokeOpacity={0.1} strokeWidth={STROKE} fill="rgba(5,5,5,0.55)" />
          {progress > 0 ? <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke="url(#arc)" strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={`${(circumference * progress) / 100} ${circumference}`} rotation={-90} origin={`${RING / 2}, ${RING / 2}`} /> : null}
        </Svg>
        <Text style={[FONTS.text.bold, styles.scoreEyebrow, { color: theme.primary }]}>SCORE</Text>
        <Text style={[FONTS.display.bold, styles.score]}>{summary.hasData ? summary.score : '—'}</Text>
        <Text style={[FONTS.text.semibold, styles.scoreMax]}>/ 100</Text>
      </View>
      <Text style={[FONTS.display.semibold, styles.label]}>{summary.hasData ? summary.scoreLabel : 'Ma journée commence'}</Text>
    </View>

    <View style={styles.stats}>
      {stats.map((s) => <View key={s.label} style={[styles.stat, { backgroundColor: `${theme.cardSolid}CC`, borderColor: `${theme.primary}33` }]}>
        <Text style={[FONTS.text.semibold, styles.statLabel]}>{s.label}</Text>
        <Text style={[FONTS.display.bold, styles.statValue]} numberOfLines={1}>{s.value}<Text style={[FONTS.text.semibold, styles.statUnit]}> {s.unit}</Text></Text>
      </View>)}
    </View>

    {summary.highlight ? <View style={[styles.highlight, { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}1F` }]}>
      <Text style={[FONTS.text.bold, styles.highlightEyebrow, { color: theme.primary }]}>POINT FORT</Text>
      <Text style={[FONTS.text.semibold, styles.highlightText]} numberOfLines={1}>{summary.highlight.label} · {summary.highlight.percent > 300 ? '300 %+' : `${summary.highlight.percent} %`}</Text>
    </View> : null}
    </View>

    <View style={styles.footer}>
      <Text style={[FONTS.text.semibold, styles.footerText]}>Ma journée avec VISOLIS</Text>
      <Text style={[FONTS.text.regular, styles.footerSub]}>nutrition · performance</Text>
    </View>
  </View>;
});

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 28, overflow: 'hidden', borderWidth: 1, backgroundColor: '#050505', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 13, letterSpacing: 3.2 },
  date: { fontSize: 12, color: 'rgba(247,241,239,0.78)' },
  center: { alignItems: 'center' },
  scoreEyebrow: { fontSize: 10, letterSpacing: 2.4, marginTop: 4 },
  score: { fontSize: 62, color: '#FFFFFF', letterSpacing: -1.5, lineHeight: 68 },
  scoreMax: { fontSize: 12, color: 'rgba(247,241,239,0.7)', marginTop: -2 },
  label: { fontSize: 22, color: '#FFFFFF', marginTop: 10, letterSpacing: -0.3 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  stat: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10 },
  statLabel: { fontSize: 11, color: 'rgba(247,241,239,0.72)' },
  statValue: { fontSize: 19, color: '#FFFFFF', marginTop: 3 },
  statUnit: { fontSize: 11, color: 'rgba(247,241,239,0.72)' },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, marginTop: 12, alignSelf: 'center', maxWidth: '100%' },
  highlightEyebrow: { fontSize: 10, letterSpacing: 1.6 },
  highlightText: { fontSize: 13, color: '#FFFFFF', flexShrink: 1 },
  body: { flex: 1, justifyContent: 'center' },
  footer: { alignItems: 'center' },
  footerText: { fontSize: 12, color: 'rgba(247,241,239,0.85)', letterSpacing: 0.4 },
  footerSub: { fontSize: 10, color: 'rgba(247,241,239,0.55)', marginTop: 2, letterSpacing: 1 },
});
