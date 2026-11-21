import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, Pressable, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from './I18nText';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { FONTS } from '../zzz/fonts';
import { Icon } from '../zzz/Icon';
import { useI18n } from '../lib/i18n';

export interface ProfilePhotoAsset {
  uri: string;
  width: number;
  height: number;
}

interface Props {
  asset: ProfilePhotoAsset;
  onCancel: () => void;
  onConfirm: (uri: string) => void;
}

interface Point {
  x: number;
  y: number;
}

function distanceBetweenTouches(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) return 0;
  const first = touches[0];
  const second = touches[1];
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

export default function ProfilePhotoCropper({ asset, onCancel, onConfirm }: Props) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cropSize = Math.max(0, Math.min(containerWidth - 44, 350));
  const baseScale = cropSize > 0 ? Math.max(cropSize / asset.width, cropSize / asset.height) : 1;
  const renderedWidth = asset.width * baseScale * zoom;
  const renderedHeight = asset.height * baseScale * zoom;
  const clampOffset = (x: number, y: number, nextZoom: number): Point => {
    const scaledWidth = asset.width * baseScale * nextZoom;
    const scaledHeight = asset.height * baseScale * nextZoom;
    const maxX = Math.max(0, (scaledWidth - cropSize) / 2);
    const maxY = Math.max(0, (scaledHeight - cropSize) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };
  const gestureStart = useRef({ offset: { x: 0, y: 0 }, zoom: 1, distance: 0 });
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 0,
    onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 0,
    onPanResponderGrant: (event) => {
      const touches = event.nativeEvent.touches;
      gestureStart.current = { offset, zoom, distance: distanceBetweenTouches(touches) };
    },
    onPanResponderMove: (event, gestureState) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2 && gestureStart.current.distance > 0) {
        const currentDistance = distanceBetweenTouches(touches);
        const nextZoom = Math.max(1, Math.min(3, gestureStart.current.zoom * (currentDistance / gestureStart.current.distance)));
        setZoom(nextZoom);
        setOffset(clampOffset(gestureStart.current.offset.x, gestureStart.current.offset.y, nextZoom));
        return;
      }
      setOffset(clampOffset(gestureStart.current.offset.x + gestureState.dx, gestureStart.current.offset.y + gestureState.dy, zoom));
    },
    onPanResponderRelease: () => {
      setOffset((current) => clampOffset(current.x, current.y, zoom));
    },
  }), [asset.height, asset.width, baseScale, cropSize, offset, zoom]);

  const changeZoom = (amount: number) => {
    const nextZoom = Math.max(1, Math.min(3, zoom + amount));
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current.x, current.y, nextZoom));
  };

  const confirmCrop = async () => {
    if (!cropSize || saving) return;
    setSaving(true);
    setError('');
    try {
      const totalScale = baseScale * zoom;
      const left = (cropSize - renderedWidth) / 2 + offset.x;
      const top = (cropSize - renderedHeight) / 2 + offset.y;
      const cropWidth = Math.min(asset.width, cropSize / totalScale);
      const cropHeight = Math.min(asset.height, cropSize / totalScale);
      const originX = Math.max(0, Math.min(asset.width - cropWidth, -left / totalScale));
      const originY = Math.max(0, Math.min(asset.height - cropHeight, -top / totalScale));
      const result = await ImageManipulator.manipulateAsync(asset.uri, [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }], { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG });
      onConfirm(result.uri);
    } catch {
      setError(t('cropper.error'));
      setSaving(false);
    }
  };

  return <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.bg }]}>
    <View style={styles.header}><Pressable onPress={onCancel} accessibilityLabel={t('cropper.cancel')} style={styles.headerButton}><Icon name="xmark" android="close" size={22} color={theme.text} /></Pressable><Text style={[FONTS.display.semibold, styles.title, { color: theme.text }]}>{t('cropper.title')}</Text><View style={styles.headerButton} /></View>
    <View style={styles.content}>
      <Text style={[FONTS.text.regular, styles.instruction, { color: theme.sub }]}>{t('cropper.subtitle')}</Text>
      <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={styles.cropArea} {...panResponder.panHandlers}>
        {cropSize > 0 ? <View style={[styles.cropViewport, { width: cropSize, height: cropSize, borderRadius: cropSize / 2, backgroundColor: theme.cardAlt }]}><Image source={{ uri: asset.uri }} resizeMode="stretch" style={{ position: 'absolute', width: renderedWidth, height: renderedHeight, left: (cropSize - renderedWidth) / 2 + offset.x, top: (cropSize - renderedHeight) / 2 + offset.y }} /><View pointerEvents="none" style={[styles.cropFrame, { width: cropSize, height: cropSize, borderRadius: cropSize / 2, borderColor: theme.primary }]} /></View> : <ActivityIndicator color={theme.primary} />}
      </View>
      <View style={styles.zoomControls}><Pressable onPress={() => changeZoom(-0.25)} style={[styles.zoomButton, { backgroundColor: theme.card, borderColor: theme.border }]}><Icon name="minus" android="remove" size={20} color={theme.text} /></Pressable><Text style={[FONTS.mono.semibold, styles.zoomLabel, { color: theme.sub }]}>{Math.round(zoom * 100)} %</Text><Pressable onPress={() => changeZoom(0.25)} style={[styles.zoomButton, { backgroundColor: theme.card, borderColor: theme.border }]}><Icon name="plus" android="add" size={20} color={theme.text} /></Pressable></View>
      {error ? <Text style={[FONTS.text.regular, styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
    <View style={styles.footer}><Pressable onPress={onCancel} style={[styles.cancelButton, { borderColor: theme.border }]}><Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>{t('cropper.cancel')}</Text></Pressable><Pressable onPress={confirmCrop} disabled={saving} style={[styles.confirmButton, { backgroundColor: theme.primary, opacity: saving ? 0.65 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <><Icon name="checkmark" android="checkmark" size={19} color="#FFFFFF" /><Text style={[FONTS.text.semibold, { color: '#FFFFFF', fontSize: 15 }]}>{t('cropper.usePhoto')}</Text></>}</Pressable></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 20, letterSpacing: -0.3 }, content: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 24 }, instruction: { maxWidth: 340, textAlign: 'center', fontSize: 15, lineHeight: 21 }, cropArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 18, overflow: 'hidden' }, cropViewport: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, cropFrame: { position: 'absolute', borderWidth: 3 }, zoomControls: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 }, zoomButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, zoomLabel: { width: 62, textAlign: 'center', fontSize: 13 }, error: { fontSize: 13, textAlign: 'center', marginBottom: 12 }, footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12 }, cancelButton: { flex: 0.8, minHeight: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, confirmButton: { flex: 1.4, minHeight: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
