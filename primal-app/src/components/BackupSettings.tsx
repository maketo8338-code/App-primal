import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { I18nText as Text } from './I18nText';
import { Card, PrimaryButton } from './ui';
import { IconBadge, SectionHeading } from './PrimalVisuals';
import { Pressable3D } from './motion';
import { useTheme, RADIUS } from '../lib/theme';
import { useStore } from '../lib/store';
import { FONTS } from '../lib/fonts';
import { buildBackup, exportBackup, pickBackup, type BackupFile } from '../backup/backup';

/** Settings › Mes données: export the journal to a file, restore it on another phone. */
export default function BackupSettings() {
  const { theme, ambience, setAmbience } = useTheme();
  const { snapshot, restoreBackup, entries } = useStore();
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);

  const exportNow = async () => {
    setBusy(true); setMessage(null);
    const result = await exportBackup(buildBackup(snapshot(), ambience));
    setBusy(false);
    if (result.ok) setMessage({ text: 'Fichier de sauvegarde créé. Garde-le dans un endroit sûr (Fichiers, Drive, e-mail).', tone: 'ok' });
    else setMessage({ text: result.reason === 'unavailable' ? (Platform.OS === 'web' ? "L'export fonctionne dans l'app installée sur le téléphone." : "Le partage n'est pas disponible sur cet appareil.") : "La sauvegarde n'a pas pu être créée. Réessaie.", tone: 'error' });
  };
  const choose = async () => {
    setMessage(null);
    const result = await pickBackup();
    if (result.ok) { setPending(result.backup); return; }
    if (result.reason !== 'cancelled') setMessage({ text: result.reason === 'invalid' ? "Ce fichier n'est pas une sauvegarde PRIMAL." : "Le fichier n'a pas pu être lu.", tone: 'error' });
  };
  const confirmRestore = () => {
    if (!pending) return;
    const ok = restoreBackup(pending.data);
    if (ok && pending.ambience && typeof pending.ambience === 'object') setAmbience(pending.ambience as never);
    setPending(null);
    setMessage(ok ? { text: 'Données restaurées.', tone: 'ok' } : { text: 'Cette sauvegarde ne contient aucune donnée utilisable.', tone: 'error' });
  };
  const when = pending ? new Date(pending.exportedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return <>
    <SectionHeading title="Mes données" eyebrow="SAUVEGARDE" />
    <Card>
      <View style={styles.row}>
        <IconBadge name="tray.and.arrow.down.fill" android="cloud-download-outline" size={38} color={theme.primary} backgroundColor={theme.primarySoft} />
        <View style={{ flex: 1 }}>
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Tes données restent sur ce téléphone</Text>
          <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }]}>Pas de compte, pas de serveur. Exporte une sauvegarde pour ne rien perdre en changeant de téléphone ({entries.length} aliment{entries.length > 1 ? 's' : ''} enregistré{entries.length > 1 ? 's' : ''}).</Text>
        </View>
      </View>
      {pending ? <View style={[styles.confirm, { borderColor: theme.danger, backgroundColor: `${theme.danger}14` }]}>
        <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14 }]}>Remplacer toutes tes données actuelles ?</Text>
        <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 4, lineHeight: 17 }]}>Sauvegarde du {when} : {pending.data.entries?.length ?? 0} aliments enregistrés. Tes données actuelles seront effacées.</Text>
        <View style={styles.confirmRow}>
          <Pressable3D onPress={() => setPending(null)} style={[styles.pill, { borderColor: theme.outline }]}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 14 }]}>Annuler</Text></Pressable3D>
          <Pressable3D onPress={confirmRestore} style={[styles.pill, { backgroundColor: theme.danger, borderColor: theme.danger }]}><Text style={[FONTS.text.bold, { color: '#140306', fontSize: 14 }]}>Restaurer</Text></Pressable3D>
        </View>
      </View> : <View style={styles.actions}>
        <PrimaryButton label={busy ? 'Préparation…' : 'Exporter une sauvegarde'} onPress={exportNow} disabled={busy} />
        <Pressable3D onPress={choose} style={[styles.secondary, { borderColor: theme.outline }]}><Text style={[FONTS.text.semibold, { color: theme.primary, fontSize: 15 }]}>Restaurer depuis un fichier</Text></Pressable3D>
      </View>}
      {message ? <Text style={[FONTS.text.semibold, styles.message, { color: message.tone === 'ok' ? theme.success : theme.danger }]}>{message.text}</Text> : null}
    </Card>
  </>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  actions: { gap: 10, marginTop: 16 },
  secondary: { borderWidth: 1.5, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center' },
  confirm: { borderWidth: 1, borderRadius: RADIUS.md, padding: 14, marginTop: 16 },
  confirmRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  pill: { flex: 1, borderWidth: 1.5, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center' },
  message: { fontSize: 13, lineHeight: 18, marginTop: 12 },
});
