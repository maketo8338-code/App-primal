import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from '../components/I18nText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import PrimalAtmosphere from '../components/PrimalAtmosphere';

export default function LanguageSelectionScreen() {
  const { theme } = useTheme();
  const { languages, language, setLanguage, t } = useI18n();
  return <View style={{ flex: 1, backgroundColor: theme.bg }}><StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} /><PrimalAtmosphere /><SafeAreaView edges={['top', 'bottom']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><View style={[styles.hero, { backgroundColor: theme.primarySoft }]}><Icon name="globe" android="globe-outline" size={30} color={theme.primary} /></View><Text style={[FONTS.display.bold, styles.title, { color: theme.text }]}>{t('language.choose')}</Text><Text style={[FONTS.text.regular, styles.subtitle, { color: theme.sub }]}>{t('language.subtitle')}</Text><View style={styles.list}>{languages.map((item) => <Pressable key={item.code} onPress={() => setLanguage(item.code)} style={({ pressed }) => [styles.row, { backgroundColor: theme.card, borderColor: item.code === language ? theme.primary : theme.border }, pressed && styles.pressed]}><Text style={styles.flag}>{item.flag}</Text><Text style={[FONTS.text.semibold, styles.name, { color: theme.text }]}>{item.name}</Text><Icon name={item.code === language ? 'checkmark.circle.fill' : 'circle'} android={item.code === language ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={item.code === language ? theme.primary : theme.sub} /></Pressable>)}</View><Text style={[FONTS.text.regular, styles.note, { color: theme.sub }]}>{t('language.applied')}</Text></ScrollView></SafeAreaView></View>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingTop: 36 }, hero: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }, title: { fontSize: 32, letterSpacing: -0.8 }, subtitle: { fontSize: 16, lineHeight: 22, marginTop: 10, marginBottom: 28 }, list: { gap: 10 }, row: { minHeight: 62, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }, flag: { fontSize: 25 }, name: { flex: 1, fontSize: 16 }, note: { fontSize: 13, lineHeight: 18, marginTop: 18 }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] } });
