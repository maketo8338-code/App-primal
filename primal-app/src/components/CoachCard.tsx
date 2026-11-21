import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { I18nText as Text } from './I18nText';
import { Surface, IconBadge, SectionHeading } from './PrimalVisuals';
import { Pressable3D } from './motion';
import { Icon } from './Icon';
import { useTheme, RADIUS } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { useI18n } from '../lib/i18n';
import { optimizeDay } from '../lib/optimizer';
import { splitFoodName } from '../lib/foodName';
import type { Food, JournalEntry, Targets } from '../types';

/**
 * Home › Coach: the two foods that best fill today's gaps (same engine as
 * « Optimiser ma journée »). Tapping one opens its card at the suggested portion.
 */
export default function CoachCard({ entries, targets, onOpenFood, onOpenDetail }: { entries: JournalEntry[]; targets: Targets; onOpenFood: (food: Food) => void; onOpenDetail: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const plan = useMemo(() => optimizeDay(entries, targets), [entries, targets]);
  const suggestions = plan.suggestions.slice(0, 2);

  if (!entries.length) {
    return <Surface style={styles.card}>
      <SectionHeading title="Ton coach" eyebrow="POUR COMPLÉTER TA JOURNÉE" />
      <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, lineHeight: 20 }]}>Ajoute ton premier repas : je te dirai ensuite quels aliments comblent le mieux tes manques du jour.</Text>
    </Surface>;
  }
  if (!suggestions.length) {
    return <Surface style={styles.card}>
      <SectionHeading title="Ton coach" eyebrow="POUR COMPLÉTER TA JOURNÉE" />
      <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 14, lineHeight: 20 }]}>Rien d'urgent à combler pour l'instant : ta journée est bien équilibrée au vu de ce que tu as enregistré.</Text>
    </Surface>;
  }
  return <Surface style={styles.card}>
    <SectionHeading title="Ton coach" eyebrow="POUR COMPLÉTER TA JOURNÉE" action="Détail" onAction={onOpenDetail} />
    <View style={{ gap: 10 }}>
      {suggestions.map((s) => {
        const { title } = splitFoodName(s.food.name);
        const portion = s.food.portionLabel && s.food.portionLabel !== `${s.portionGrams} g` ? `${t(s.food.portionLabel)} · ${s.portionGrams} g` : `${s.portionGrams} g`;
        return <Pressable3D key={s.food.id} accessibilityLabel={`Voir ${title}`} onPress={() => onOpenFood(s.food)} style={[styles.row, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
          <IconBadge name="sparkles" android="sparkles" size={36} color={theme.primary} backgroundColor={theme.primarySoft} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[FONTS.text.semibold, { color: theme.text, fontSize: 15 }]} numberOfLines={1}>{title}</Text>
            <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 12, marginTop: 2 }]} numberOfLines={1}>{portion}</Text>
            <View style={styles.chips}>{s.impacts.slice(0, 3).map((impact) => <View key={impact.key} style={[styles.chip, { backgroundColor: theme.primarySoft }]}>
              <Text style={[FONTS.text.semibold, { color: theme.primary, fontSize: 11 }]}>{impact.label} +{Math.min(100, Math.round(impact.percentTarget))} %</Text>
            </View>)}</View>
          </View>
          <View style={[styles.add, { backgroundColor: theme.primary }]}><Icon android="add" size={18} color={theme.onPrimary} /></View>
        </Pressable3D>;
      })}
    </View>
    <Text style={[FONTS.text.regular, { color: theme.sub, fontSize: 11, marginTop: 10, lineHeight: 16 }]}>« +x % » = part de ce qu'il te manque aujourd'hui que cette portion comble.</Text>
  </Surface>;
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: RADIUS.md, padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  chip: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  add: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
