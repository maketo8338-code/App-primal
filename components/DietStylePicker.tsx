import React from 'react';
import { Pressable, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from './I18nText';
import { useTheme } from '../lib/theme';
import { Pressable3D } from './motion';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { DietStyleId } from '../types';
import { DIET_STYLE_OPTIONS } from '../lib/dietStyles';
import { useI18n } from '../lib/i18n';

export default function DietStylePicker({ selected, onSelect }: { selected: DietStyleId; onSelect: (style: DietStyleId) => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  return <View style={styles.list}>{DIET_STYLE_OPTIONS.map((option) => <Pressable3D key={option.id} onPress={() => onSelect(option.id)} style={[styles.card, { backgroundColor: selected === option.id ? theme.primarySoft : theme.card, borderColor: selected === option.id ? theme.primary : theme.border }]}><View style={[styles.icon, { backgroundColor: selected === option.id ? theme.primary : theme.cardAlt }]}><Icon name={option.icon} android={option.androidIcon} size={18} color={selected === option.id ? theme.onPrimary : theme.primary} /></View><View style={styles.copy}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>{t(`diet.${option.id}.label`)}</Text><Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, lineHeight: 17, marginTop: 3 }]}>{t(`diet.${option.id}.description`)}</Text></View><Icon name={selected === option.id ? 'checkmark.circle.fill' : 'circle'} android={selected === option.id ? 'checkmark-circle' : 'radio-button-off'} size={21} color={selected === option.id ? theme.primary : theme.border} /></Pressable3D>)}</View>;
}
const styles = StyleSheet.create({ list: { gap: 10 }, card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 22, padding: 14 }, icon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, pressed: { opacity: 0.8 } });
