import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { I18nText as Text } from './I18nText';
import { Card, Chip } from './ui';
import { IconBadge, SectionHeading } from './PrimalVisuals';
import { Pressable3D } from './motion';
import { Icon } from './Icon';
import { AccentId, AmbienceIntensity, glow, PALETTES, useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';

const INTENSITIES: Array<{ id: AmbienceIntensity; label: string }> = [
  { id: 'soft', label: 'Discrète' },
  { id: 'normal', label: 'Normale' },
  { id: 'intense', label: 'Intense' },
];

/** Settings › Ambiance: particles on/off, their intensity, and the accent colour of the whole app. */
export default function AmbienceSettings() {
  const { theme, ambience, setAmbience } = useTheme();
  return <>
    <SectionHeading title="Ambiance" eyebrow="PERSONNALISATION" />
    <Card>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <IconBadge name="sparkles" android="sparkles" size={38} color={theme.primary} backgroundColor={theme.primarySoft} />
          <View style={{ flex: 1 }}>
            <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Particules lumineuses</Text>
            <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }]}>{ambience.enabled ? 'Elles réagissent au toucher et aux mouvements.' : 'Désactivées : fond noir uni, moins de batterie.'}</Text>
          </View>
        </View>
        <Switch accessibilityLabel="Particules lumineuses" value={ambience.enabled} onValueChange={(enabled) => setAmbience({ enabled })} trackColor={{ false: theme.cardAlt, true: theme.primary }} thumbColor="#FFFFFF" {...({ activeThumbColor: "#FFFFFF" } as object)} />
      </View>
      {ambience.enabled ? <View style={[styles.block, { borderTopColor: theme.border }]}>
        <Text style={[FONTS.text.semibold, styles.label, { color: theme.sub }]}>Intensité</Text>
        <View style={styles.chips}>{INTENSITIES.map((item) => <Chip key={item.id} label={item.label} selected={ambience.intensity === item.id} onPress={() => setAmbience({ intensity: item.id })} />)}</View>
      </View> : null}
      <View style={[styles.row, styles.block, { borderTopColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Son de l'intro</Text>
          <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }]}>Un son léger au lancement. Muet si le téléphone est en silencieux.</Text>
        </View>
        <Switch accessibilityLabel="Son de l'intro" value={ambience.introSound} onValueChange={(introSound) => setAmbience({ introSound })} trackColor={{ false: theme.cardAlt, true: theme.primary }} thumbColor="#FFFFFF" {...({ activeThumbColor: '#FFFFFF' } as object)} />
      </View>
      <View style={[styles.row, styles.block, { borderTopColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]}>Vibrations de l'intro</Text>
          <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }]}>De légères pulsations au rythme de l'animation.</Text>
        </View>
        <Switch accessibilityLabel="Vibrations de l'intro" value={ambience.introHaptics} onValueChange={(introHaptics) => setAmbience({ introHaptics })} trackColor={{ false: theme.cardAlt, true: theme.primary }} thumbColor="#FFFFFF" {...({ activeThumbColor: '#FFFFFF' } as object)} />
      </View>
      <View style={[styles.block, { borderTopColor: theme.border }]}>
        <Text style={[FONTS.text.semibold, styles.label, { color: theme.sub }]}>Couleur</Text>
        <View style={styles.swatches}>{(Object.keys(PALETTES) as AccentId[]).map((id) => {
          const palette = PALETTES[id]; const selected = ambience.accent === id;
          return <Pressable3D key={id} accessibilityLabel={`Couleur ${palette.label}`} accessibilityState={{ selected }} onPress={() => setAmbience({ accent: id })} tilt={0} sink={0.9} style={styles.swatchItem}>
            <View style={[styles.swatch, { backgroundColor: palette.primary, borderColor: selected ? theme.text : 'transparent' }, selected ? glow(palette.neon, 0.9) : null]}>
              {selected ? <Icon android="checkmark" size={18} color={palette.onPrimary} /> : null}
            </View>
            <Text style={[selected ? FONTS.text.bold : FONTS.text.regular, { color: selected ? theme.text : theme.sub, fontSize: 12, marginTop: 6 }]}>{palette.label}</Text>
          </Pressable3D>;
        })}</View>
        <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, lineHeight: 17, marginTop: 12 }]}>La couleur s'applique aux particules et à toute l'app.</Text>
      </View>
    </Card>
  </>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
  block: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 14 },
  label: { fontSize: 12, letterSpacing: 0.4, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchItem: { alignItems: 'center', minWidth: 52 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
