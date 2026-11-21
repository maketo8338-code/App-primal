import React from 'react';
import { StyleSheet, View } from 'react-native';
import { I18nText as Text } from './I18nText';
import { useTheme } from '../lib/theme';
import { AdviceKind, NutritionAdvice } from '../lib/advice';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { Surface } from './PrimalVisuals';
import { useI18n } from '../lib/i18n';

interface Props { advice: NutritionAdvice[]; }
function visualFor(kind: AdviceKind) { if (kind === 'hydration') return { name: 'drop.fill', android: 'water' }; if (kind === 'macro') return { name: 'bolt.fill', android: 'flash' }; return { name: 'sparkles', android: 'sparkles' }; }
function fill(template: string, missing: string) { return template.replace('{missing}', missing); }
export function AdviceCard({ advice }: Props) {
  const { theme } = useTheme(); const { t } = useI18n();
  if (!advice.length) return null;
  return <Surface style={[styles.card, { backgroundColor: theme.aquaSoft, borderColor: theme.aquaSoft }]}>
    <View style={styles.heading}><View style={[styles.headingIcon, { backgroundColor: theme.card }]}><Icon name="sparkles" android="sparkles" size={18} color={theme.aqua} /></View><View style={{ flex: 1 }}><Text style={[FONTS.text.semibold, styles.headingTitle, { color: theme.text }]}>{t('advice.title')}</Text><Text style={[FONTS.text.regular, styles.headingSub, { color: theme.sub }]}>{t('advice.subtitle')}</Text></View></View>
    <View style={styles.list}>{advice.map((item, index) => { const visual = visualFor(item.kind); const label = item.key === 'water' ? t('profile.hydration') : t(`nutrient.${item.key}`); const detailKey = item.kind === 'hydration' ? 'advice.remaining' : item.status === 'insufficient' ? 'advice.insufficient' : 'advice.near'; return <View key={item.key} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}><View style={[styles.itemIcon, { backgroundColor: theme.card }]}><Icon name={visual.name} android={visual.android} size={17} color={item.kind === 'hydration' ? theme.primary : item.kind === 'macro' ? theme.accent : theme.aqua} /></View><View style={styles.copy}><View style={styles.itemTop}><Text style={[FONTS.text.semibold, styles.itemLabel, { color: theme.text }]}>{label}</Text><Text style={[FONTS.mono.semibold, styles.percent, { color: item.status === 'insufficient' ? theme.danger : theme.warn }]}>{item.percent}%</Text></View><Text style={[FONTS.text.regular, styles.detail, { color: theme.sub }]}>{fill(t(detailKey), item.missing)}</Text>{item.suggestions.length ? <Text style={[FONTS.text.semibold, styles.suggestions, { color: theme.text }]}>{t('advice.suggestions')}: {item.suggestions.map((suggestion) => t(suggestion)).join(' · ')}</Text> : null}</View></View>; })}</View>
  </Surface>;
}
const styles = StyleSheet.create({ card: { padding: 16 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 11 }, headingIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, headingTitle: { fontSize: 15 }, headingSub: { fontSize: 12, marginTop: 2, lineHeight: 17 }, list: { marginTop: 12 }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12 }, itemIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0 }, itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, itemLabel: { flex: 1, fontSize: 14 }, percent: { fontSize: 13 }, detail: { fontSize: 13, lineHeight: 19, marginTop: 3 }, suggestions: { fontSize: 12, lineHeight: 17, marginTop: 5 } });