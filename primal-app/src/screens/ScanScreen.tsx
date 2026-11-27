import React, { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from '../components/I18nText';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { Pressable3D } from '../components/motion';
import { FONTS } from '../lib/fonts';
import { Icon } from '../components/Icon';
import { fetchBarcode } from '../lib/foodSources';
import { Food } from '../types';

interface Props { onFound: (food: Food) => void; onClose: () => void; onManualSearch: () => void; }

export default function ScanScreen({ onFound, onClose, onManualSearch }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const scannedRef = useRef(false);

  const handleBarcode = async (code: string) => {
    if (scannedRef.current || searching) return;
    scannedRef.current = true; setSearching(true); setError(null);
    try {
      const food = await fetchBarcode(code);
      if (food) onFound(food);
      else { setError('Produit introuvable dans Open Food Facts. Utilise la recherche manuelle pour continuer.'); }
    } catch { setError('Recherche impossible. Vérifie ta connexion ou utilise la recherche manuelle.'); }
    finally { setSearching(false); }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#140C0A' }} />;
  if (!permission.granted) return <View style={[styles.permission, { paddingTop: insets.top + 32, paddingBottom: Math.max(insets.bottom, 20) }]}><View style={[styles.cameraBadge, { backgroundColor: theme.primarySoft }]}><Icon name="barcode.viewfinder" android="barcode-outline" size={34} color={theme.primary} /></View><Text style={[FONTS.display.semibold, styles.permissionTitle]}>Scanner un produit</Text><Text style={[FONTS.text.regular, styles.permissionText]}>VISOLIS utilise l’appareil photo uniquement pour lire le code-barres et retrouver la fiche produit.</Text><Pressable3D onPress={permission.canAskAgain ? requestPermission : Linking.openSettings} style={[styles.permissionButton, { backgroundColor: theme.primary }]}><Text style={[FONTS.text.semibold, { color: theme.onPrimary, fontSize: 16 }]}>{permission.canAskAgain ? 'Autoriser la caméra' : 'Ouvrir les réglages'}</Text></Pressable3D><Pressable3D onPress={onManualSearch} style={styles.manualLink}><Text style={[FONTS.text.semibold, { color: theme.aqua, fontSize: 15 }]}>Rechercher manuellement</Text></Pressable3D><Pressable3D onPress={onClose} style={styles.backLink}><Text style={[FONTS.text.regular, { color: 'rgba(255,255,255,0.62)', fontSize: 14 }]}>Retour</Text></Pressable3D></View>;

  return <View style={{ flex: 1, backgroundColor: '#140C0A' }}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={({ data }) => handleBarcode(data)} />
    <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}><View style={styles.scanHeader}><Pressable3D onPress={onClose} style={[styles.closeBtn]}><Icon name="xmark" android="close" size={20} color="#FFFFFF" /></Pressable3D></View>
      <View style={styles.center}><View style={styles.scanFrame}><View style={styles.cornerTopLeft} /><View style={styles.cornerTopRight} /><View style={styles.cornerBottomLeft} /><View style={styles.cornerBottomRight} /></View><Text style={[FONTS.text.semibold, styles.scanTitle]}>{searching ? 'Recherche du produit…' : 'Cadre le code-barres'}</Text><Text style={[FONTS.text.regular, styles.scanSub]}>{searching ? 'Open Food Facts interroge la fiche produit' : 'Le scan se lance automatiquement'}</Text>{error ? <View style={styles.errorBox}><Icon name="exclamationmark.circle.fill" android="alert-circle" size={17} color="#FCA5A5" /><Text style={[FONTS.text.regular, styles.errorText]}>{error}</Text></View> : null}</View>
      <View style={styles.bottom}><Pressable3D onPress={onManualSearch} style={[styles.manualButton]}><Icon name="magnifyingglass" android="search" size={17} color="#FFFFFF" /><Text style={[FONTS.text.semibold, { color: '#FFFFFF', fontSize: 15 }]}>Recherche manuelle</Text></Pressable3D><Text style={[FONTS.text.regular, styles.attribution]}>Données produit : Open Food Facts</Text></View>
    </View></View>;
}
const styles = StyleSheet.create({
  permission: { flex: 1, backgroundColor: '#140C0A', alignItems: 'center', paddingHorizontal: 30 }, cameraBadge: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', marginTop: 70 }, permissionTitle: { color: '#FFFFFF', fontSize: 27, letterSpacing: -0.6, marginTop: 20 }, permissionText: { color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center' }, permissionButton: { alignSelf: 'stretch', alignItems: 'center', borderRadius: 999, paddingVertical: 16, marginTop: 28 }, manualLink: { marginTop: 19, padding: 8 }, backLink: { marginTop: 9, padding: 8 },
  overlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(20,10,8,0.30)' }, scanHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 }, closeBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(20,10,8,0.68)', alignItems: 'center', justifyContent: 'center' }, center: { alignItems: 'center', paddingHorizontal: 22 }, scanFrame: { width: 242, height: 190, position: 'relative' }, cornerTopLeft: { position: 'absolute', left: 0, top: 0, width: 47, height: 47, borderLeftWidth: 4, borderTopWidth: 4, borderColor: '#FFFFFF', borderTopLeftRadius: 26 }, cornerTopRight: { position: 'absolute', right: 0, top: 0, width: 47, height: 47, borderRightWidth: 4, borderTopWidth: 4, borderColor: '#FFFFFF', borderTopRightRadius: 26 }, cornerBottomLeft: { position: 'absolute', left: 0, bottom: 0, width: 47, height: 47, borderLeftWidth: 4, borderBottomWidth: 4, borderColor: '#FFFFFF', borderBottomLeftRadius: 26 }, cornerBottomRight: { position: 'absolute', right: 0, bottom: 0, width: 47, height: 47, borderRightWidth: 4, borderBottomWidth: 4, borderColor: '#FFFFFF', borderBottomRightRadius: 26 }, scanTitle: { color: '#FFFFFF', fontSize: 17, marginTop: 22 }, scanSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 5 }, errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 330, marginTop: 17, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 15, backgroundColor: 'rgba(104,24,34,0.80)' }, errorText: { color: '#FFE2E2', fontSize: 13, flex: 1, lineHeight: 18 }, bottom: { alignItems: 'center', gap: 12 }, manualButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(20,10,8,0.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 13 }, attribution: { color: 'rgba(255,255,255,0.6)', fontSize: 11 }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
