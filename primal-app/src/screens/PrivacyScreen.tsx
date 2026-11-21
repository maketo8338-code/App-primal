import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeonScrollView as ScrollView } from '../components/NeonScroll';
import { Pressable3D } from '../components/motion';
import { Icon } from '../components/Icon';
import { Card } from '../components/ui';
import { useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { useI18n } from '../lib/i18n';
import { privacyFor } from '../legal/privacy';

/** Politique de confidentialité lisible hors ligne (Réglages › Légal). Texte brut : pas de traduction automatique. */
export default function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, language } = useI18n();
  const policy = privacyFor(language);
  return <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable3D onPress={onBack} style={[styles.back, { borderColor: theme.outline, backgroundColor: theme.card }]}>
        <Icon name="chevron.left" android="chevron-back" size={20} color={theme.text} />
        <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>{t('common.back')}</Text>
      </Pressable3D>
      <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>{policy.title}</Text>
      <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 4 }]}>{policy.updated}</Text>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <Text style={[FONTS.text.regular, styles.intro, { color: theme.text }]}>{policy.intro}</Text>
      {policy.sections.map((section) => <Card key={section.title} style={{ marginBottom: 12 }}>
        <Text style={[FONTS.text.bold, styles.sectionTitle, { color: theme.primary }]}>{section.title}</Text>
        {section.body.map((p, i) => <Text key={i} style={[FONTS.text.regular, styles.paragraph, { color: theme.sub }]}>{p}</Text>)}
      </Card>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingLeft: 8, paddingRight: 14 },
  title: { fontSize: 28, letterSpacing: -0.5, marginTop: 18 },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  sectionTitle: { fontSize: 14, marginBottom: 6 },
  paragraph: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
