import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nText as Text } from '../components/I18nText';
import { Icon } from '../components/Icon';
import { Pressable3D } from '../components/motion';
import { glow, MOTION, NEON, RADIUS, useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { useI18n } from '../lib/i18n';
import { todayKey } from '../lib/nutrition';
import { useSession } from './session';

const TABS: Record<string, { labelKey: string; icon: string; active: string }> = {
  index: { labelKey: 'nav.home', icon: 'home-outline', active: 'home' },
  foods: { labelKey: 'nav.foods', icon: 'search-outline', active: 'search' },
  journal: { labelKey: 'nav.journal', icon: 'calendar-outline', active: 'calendar' },
  profile: { labelKey: 'nav.profile', icon: 'person-circle-outline', active: 'person-circle' },
};

function TabButton({ routeName, focused, onPress }: { routeName: string; focused: boolean; onPress: () => void }) {
  const { theme } = useTheme(); const { t } = useI18n(); const tab = TABS[routeName];
  const on = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => { Animated.spring(on, { toValue: focused ? 1 : 0, useNativeDriver: true, ...MOTION.spring }).start(); }, [focused, on]);
  if (!tab) return null;
  return <Pressable3D onPress={onPress} tilt={0} sink={0.9} style={styles.tab} accessibilityLabel={t(tab.labelKey)} accessibilityState={{ selected: focused }}>
    <View style={styles.iconWrap}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.activePill, { backgroundColor: theme.primarySoft, borderColor: theme.outline, opacity: on, transform: [{ scaleX: on.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]} />
      <Icon android={(focused ? tab.active : tab.icon) as never} size={20} color={focused ? theme.primary : theme.sub} />
    </View>
    <Text style={[focused ? FONTS.text.bold : FONTS.text.semibold, styles.label, { color: focused ? theme.primary : theme.sub }]}>{t(tab.labelKey)}</Text>
    <Animated.View style={[styles.dot, { backgroundColor: theme.primary, opacity: on }, glow(theme.primary, 0.7)]} />
  </Pressable3D>;
}

export default function NeonTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme(); const { t } = useI18n(); const insets = useSafeAreaInsets(); const session = useSession();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [pulse]);

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name); if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    // As before: opening the food search from its tab always targets today.
    if (name === 'foods') session.setFoodDate(todayKey());
    if (!event.defaultPrevented) navigation.navigate(name);
  };
  const add = () => { session.setSelectedMeal('snack'); session.setFoodDate(todayKey()); navigation.navigate('foods'); };
  const focusedName = state.routes[state.index]?.name;
  const order = ['index', 'foods', 'add', 'journal', 'profile'];

  return <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
    <View style={[styles.bar, { backgroundColor: '#0D0809F2', borderColor: theme.border }]}>
      <LinearGradient colors={['#FF3B4E22', '#FF3B4E00']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]} pointerEvents="none" />
      {order.map((name) => name === 'add'
        ? <Pressable3D key="add" accessibilityLabel={t('foods.addTitle')} onPress={add} tilt={16} sink={0.9} style={styles.addButton}>
            <Animated.View style={[styles.addHalo, { backgroundColor: NEON.neon, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) }] }]} />
            <View style={[styles.addOrb, { borderColor: '#0D0809' }, glow(theme.neon, 1)]}>
              <LinearGradient colors={theme.primaryGradient} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 27 }]} />
              <View style={styles.addGloss} />
              <Icon android="add" size={28} color={theme.onPrimary} />
            </View>
            <Text style={[FONTS.text.bold, styles.label, { color: theme.primary, marginTop: 5 }]}>{t('nav.add')}</Text>
          </Pressable3D>
        : <TabButton key={name} routeName={name} focused={focusedName === name} onPress={() => go(name)} />)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: 12, paddingTop: 4, backgroundColor: 'transparent' },
  bar: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: RADIUS.xl, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 52 },
  iconWrap: { width: 50, height: 32, alignItems: 'center', justifyContent: 'center' },
  activePill: { borderRadius: RADIUS.pill, borderWidth: 1 },
  label: { fontSize: 11, marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  addButton: { width: 70, alignItems: 'center', justifyContent: 'flex-end', marginTop: -34 },
  addHalo: { position: 'absolute', top: -6, width: 74, height: 74, borderRadius: 37 },
  addOrb: { width: 62, height: 62, borderRadius: 31, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF2D44' },
  addGloss: { position: 'absolute', top: 5, left: 14, right: 14, height: 14, borderRadius: 10, backgroundColor: '#FFFFFF', opacity: 0.28 },
});
