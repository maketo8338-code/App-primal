import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { I18nText as Text } from '../components/I18nText';
import { Pressable3D } from '../components/motion';
import { Icon } from '../components/Icon';
import { Card, PrimaryButton } from '../components/ui';
import { IconBadge } from '../components/PrimalVisuals';
import { PALETTES, useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { useI18n } from '../lib/i18n';
import { unlockedByCode } from './codes';

/** Settings › « Ajouter un code promotionnel »: unlocks themes without tapping a padlock first. */
export default function PromoCodeRow() {
  const { theme, ambience, setAmbience } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const inputRef = useRef<TextInput>(null);

  const show = () => { setCode(''); setError(false); setDone(null); setOpen(true); };
  const submit = () => {
    const found = unlockedByCode(code);
    if (!found.length) {
      setError(true);
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 50 }));
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return;
    }
    setAmbience({ unlocked: Array.from(new Set([...ambience.unlocked, ...found])), accent: found[0] });
    setDone(found.map((id) => t(PALETTES[id].label)).join(', '));
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  return <>
    <Card>
      <Pressable3D accessibilityLabel={t('Ajouter un code promotionnel')} onPress={show} style={styles.row}>
        <View style={styles.rowMain}>
          <IconBadge name="gift.fill" android="gift" size={36} color={theme.primary} backgroundColor={theme.primarySoft} />
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14 }]}>Ajouter un code promotionnel</Text>
        </View>
        <Icon name="chevron.right" android="chevron-forward" size={18} color={theme.sub} />
      </Pressable3D>
    </Card>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} onShow={() => setTimeout(() => inputRef.current?.focus(), 80)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <Animated.View style={[styles.sheet, { backgroundColor: theme.cardSolid, borderColor: theme.outline }, shakeStyle]}>
          <Pressable onPress={() => undefined}>
            {done ? <>
              <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>Code accepté</Text>
              <Text style={[FONTS.text.regular, styles.sub, { color: theme.sub }]}>{`${t('Débloqué')} : ${done}`}</Text>
              <View style={{ marginTop: 18 }}><PrimaryButton label={t('Fermer')} onPress={() => setOpen(false)} /></View>
            </> : <>
              <Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>Code promotionnel</Text>
              <Text style={[FONTS.text.regular, styles.sub, { color: theme.sub }]}>Entre ton code pour débloquer un thème.</Text>
              <TextInput ref={inputRef} value={code} onChangeText={(v) => { setCode(v); setError(false); }} onSubmitEditing={submit} autoCapitalize="none" autoCorrect={false} placeholder={t('CODE')} placeholderTextColor={theme.sub} maxLength={60} returnKeyType="done"
                style={[FONTS.mono.semibold, styles.input, { color: theme.text, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.cardAlt }]} />
              {error ? <Text style={[FONTS.text.semibold, { color: theme.danger, fontSize: 12, textAlign: 'center', marginTop: 8 }]}>Code invalide</Text> : null}
              <View style={{ marginTop: 16 }}><PrimaryButton label={t('Valider')} onPress={submit} /></View>
            </>}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sheet: { width: '100%', maxWidth: 360, borderRadius: 26, borderWidth: 1, padding: 22 },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  input: { marginTop: 16, borderWidth: 1.5, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, fontSize: 16, letterSpacing: 2, textAlign: 'center' },
});
