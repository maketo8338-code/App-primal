import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { I18nText as Text } from '../components/I18nText';
import { NeonScrollView as ScrollView } from '../components/NeonScroll';
import { Pressable3D } from '../components/motion';
import { PrimaryButton } from '../components/ui';
import { Icon } from '../components/Icon';
import { FONTS } from '../lib/fonts';
import { glow, RADIUS, useTheme } from '../lib/theme';
import { CARD_HEIGHT, CARD_WIDTH, ShareCard } from './ShareCard';
import { useDaySummary } from './useDaySummary';

/** Preview the « Ma journée PRIMAL » card and send it through the phone's share sheet. */
export default function ShareDayScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const summary = useDaySummary();
  const card = useRef<View>(null);
  const [showCalories, setShowCalories] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';
  // Scale the card down on narrow screens; the captured image is always 1080 × 1350.
  const scale = Math.min(1, (width - 32) / CARD_WIDTH);

  const share = async () => {
    if (!card.current || busy) return;
    setBusy(true); setMessage(null);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1350 });
      if (!(await Sharing.isAvailableAsync())) { setMessage("Le partage n'est pas disponible sur cet appareil."); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Partager ma journée' });
    } catch {
      setMessage("L'image n'a pas pu être créée. Réessaie dans un instant.");
    } finally { setBusy(false); }
  };

  return <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable3D onPress={onBack} style={[styles.back, { borderColor: theme.outline, backgroundColor: theme.card }]}><Icon android="chevron-back" size={20} color={theme.text} /><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 16 }]}>Retour</Text></Pressable3D>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
      <Text style={[FONTS.text.bold, styles.eyebrow, { color: theme.primary }]}>PARTAGE</Text>
      <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>Ma journée</Text>
      <Text style={[FONTS.text.regular, styles.subtitle, { color: theme.sub }]}>Une image à envoyer sur WhatsApp, Instagram ou Snapchat. Ton poids et tes repas ne sont jamais affichés.</Text>

      <View style={[styles.cardWrap, { width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }, glow(theme.neon, 0.6)]}>
        <View style={{ transform: [{ scale }], transformOrigin: 'top left' } as never}>
          <ShareCard ref={card} summary={summary} showCalories={showCalories} />
        </View>
      </View>

      <View style={[styles.option, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Afficher les calories</Text>
          <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2 }]}>Désactive pour ne montrer que le score, les protéines et l'eau.</Text>
        </View>
        <Switch accessibilityLabel="Afficher les calories" value={showCalories} onValueChange={setShowCalories} trackColor={{ false: theme.cardAlt, true: theme.primary }} thumbColor="#FFFFFF" {...({ activeThumbColor: '#FFFFFF' } as object)} />
      </View>

      <PrimaryButton label={busy ? 'Préparation…' : 'Partager'} onPress={share} disabled={busy || isWeb} />
      {isWeb ? <Text style={[FONTS.text.regular, styles.note, { color: theme.sub }]}>Dans cet aperçu web, le partage est bloqué par le navigateur. Il fonctionne dans l'app installée sur le téléphone.</Text> : null}
      {message ? <Text style={[FONTS.text.semibold, styles.note, { color: theme.danger }]}>{message}</Text> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 6 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: RADIUS.pill, paddingVertical: 7, paddingLeft: 8, paddingRight: 14 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, marginTop: 6 },
  title: { fontSize: 33, letterSpacing: -0.4, marginTop: -10 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: -8 },
  cardWrap: { alignSelf: 'center', borderRadius: 28 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: RADIUS.lg, padding: 16 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
