import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text as NativeText, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { I18nText as Text } from './components/I18nText';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT, MOTION, RADIUS, shadow, ThemeProvider, useTheme } from './lib/theme';
import { I18nProvider, useI18n } from './lib/i18n';
import { StoreProvider, useStore } from './lib/store';
import { useAppFonts, FONTS } from './zzz/fonts';
import { Icon } from './zzz/Icon';
import { Food, MealId } from './types';
import { todayKey } from './lib/nutrition';
import { syncSmartNotifications } from './lib/notificationEngine';
import HomeScreen from './screens/HomeScreen';
import FoodSearchScreen from './screens/FoodSearchScreen';
import FoodDetailScreen from './screens/FoodDetailScreen';
import JournalScreen from './screens/JournalScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import MicrosScreen from './screens/MicrosScreen';
import ScoreDetailScreen from './screens/ScoreDetailScreen';
import HydrationScreen from './screens/HydrationScreen';
import ActivityScreen from './screens/ActivityScreen';
import SleepScreen from './screens/SleepScreen';
import OutdoorScreen from './screens/OutdoorScreen';
import StatsScreen from './screens/StatsScreen';
import OptimizeDayScreen from './screens/OptimizeDayScreen';
import ScanScreen from './screens/ScanScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LanguageSelectionScreen from './screens/LanguageSelectionScreen';
import ThemeChoiceScreen from './screens/ThemeChoiceScreen';
import PrimalAtmosphere from './components/PrimalAtmosphere';
import { Pressable3D } from './components/motion';

type Tab = 'home' | 'foods' | 'add' | 'journal' | 'profile';
type Overlay = { type: 'none' } | { type: 'food'; food: Food; meal: MealId } | { type: 'scan' } | { type: 'settings' } | { type: 'micros' } | { type: 'score' } | { type: 'hydration' } | { type: 'activity' } | { type: 'sleep' } | { type: 'outdoor' } | { type: 'stats' } | { type: 'optimize' };
interface TabConfig { id: Tab; labelKey: string; icon: string; android: string; }
const tabs: TabConfig[] = [
  { id: 'home', labelKey: 'nav.home', icon: 'house.fill', android: 'home' },
  { id: 'foods', labelKey: 'nav.foods', icon: 'magnifyingglass', android: 'search' },
  { id: 'journal', labelKey: 'nav.journal', icon: 'calendar', android: 'calendar' },
  { id: 'profile', labelKey: 'nav.profile', icon: 'person.crop.circle.fill', android: 'person-circle' },
];

function TabButton({ tab, active, onPress }: { tab: TabConfig; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const on = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => { Animated.spring(on, { toValue: active ? 1 : 0, useNativeDriver: true, ...MOTION.spring }).start(); }, [active, on]);
  return <Pressable3D onPress={onPress} tilt={0} sink={0.92} style={styles.tabButton}><View style={styles.tabIcon}><Animated.View style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.pill, backgroundColor: theme.primarySoft, opacity: on, transform: [{ scaleX: on.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]} /><Icon name={tab.icon as any} android={tab.android as any} size={19} color={active ? theme.primary : theme.sub} /></View><Text style={[active ? FONTS.text.bold : FONTS.text.semibold, styles.tabLabel, { color: active ? theme.primary : theme.sub }]}>{t(tab.labelKey)}</Text></Pressable3D>;
}

function TabBar({ active, onTab, onAdd }: { active: Tab; onTab: (tab: Tab) => void; onAdd: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return <View style={[styles.tabDock, { paddingBottom: Math.max(insets.bottom, 12) }]}><View style={[styles.tabBar, { backgroundColor: theme.cardSolid, borderColor: theme.border }, shadow(theme, 3)]}>
    {tabs.slice(0, 2).map((tab) => <TabButton key={tab.id} tab={tab} active={active === tab.id} onPress={() => onTab(tab.id)} />)}
    <Pressable3D accessibilityLabel={t('foods.addTitle')} onPress={onAdd} tilt={14} sink={0.92} style={styles.addButton}><View style={[styles.addOrb, { backgroundColor: theme.primary, borderColor: theme.cardSolid }, shadow(theme, 2, theme.primary)]}><LinearGradient colors={theme.primaryGradient} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} /><View style={styles.addGloss} /><Icon name="plus" android="add" size={26} color={theme.onPrimary} /></View><Text style={[FONTS.text.bold, styles.addLabel, { color: theme.primary }]}>{t('nav.add')}</Text></Pressable3D>
    {tabs.slice(2).map((tab) => <TabButton key={tab.id} tab={tab} active={active === tab.id} onPress={() => onTab(tab.id)} />)}
  </View></View>;
}

function Root() {
  const { theme, themeReady, needsThemeChoice } = useTheme();
  const { ready: i18nReady, languageChosen } = useI18n();
  const { ready, addEntry, entries, habits, profile, notificationPreferences } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [selectedMeal, setSelectedMeal] = useState<MealId>('snack');
  const [foodDate, setFoodDate] = useState(todayKey());
  const [overlay, setOverlay] = useState<Overlay>({ type: 'none' });

  useEffect(() => {
    if (!ready) return;
    void syncSmartNotifications({ entries, habits, targets: profile.targets, preferences: notificationPreferences }).catch(() => undefined);
  }, [ready, entries, habits, profile.targets, notificationPreferences]);

  if (!themeReady) return <View style={{ flex: 1, backgroundColor: theme.bg }}><StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} /></View>;
  if (needsThemeChoice) return <ThemeChoiceScreen />;
  if (!i18nReady || !ready) return <View style={{ flex: 1, backgroundColor: theme.bg }}><StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} /></View>;
  if (!profile.onboarded && !languageChosen) return <LanguageSelectionScreen />;
  if (!profile.onboarded) return <><StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} /><OnboardingScreen /></>;

  const openFood = (food: Food, meal: MealId) => setOverlay({ type: 'food', food, meal });
  let content: React.ReactNode;
  if (overlay.type === 'food') content = <FoodDetailScreen food={overlay.food} defaultMeal={overlay.meal} onBack={() => setOverlay({ type: 'none' })} onAdd={(grams, meal) => { addEntry({ date: foodDate, meal, foodName: overlay.food.name, brand: overlay.food.brand, source: overlay.food.source, foodId: overlay.food.id, grams, per100: overlay.food.per100 }); setOverlay({ type: 'none' }); setTab('journal'); }} />;
  else if (overlay.type === 'scan') content = <ScanScreen onFound={(food) => setOverlay({ type: 'food', food, meal: selectedMeal })} onClose={() => setOverlay({ type: 'none' })} onManualSearch={() => { setOverlay({ type: 'none' }); setFoodDate(todayKey()); setTab('add'); }} />;
  else if (overlay.type === 'settings') content = <SettingsScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'micros') content = <MicrosScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'score') content = <ScoreDetailScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'hydration') content = <HydrationScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'activity') content = <ActivityScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'sleep') content = <SleepScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'outdoor') content = <OutdoorScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'stats') content = <StatsScreen onBack={() => setOverlay({ type: 'none' })} />;
  else if (overlay.type === 'optimize') content = <OptimizeDayScreen onBack={() => setOverlay({ type: 'none' })} onOpenFood={(food) => { setFoodDate(todayKey()); setOverlay({ type: 'food', food, meal: 'snack' }); }} />;
  else content = <View style={{ flex: 1 }}>{tab === 'home' && <HomeScreen onAddFood={() => { setSelectedMeal('snack'); setFoodDate(todayKey()); setTab('add'); }} onOpenJournal={() => setTab('journal')} onOpenMicros={() => setOverlay({ type: 'micros' })} onOpenScore={() => setOverlay({ type: 'score' })} onOpenHydration={() => setOverlay({ type: 'hydration' })} onOpenActivity={() => setOverlay({ type: 'activity' })} onOpenSleep={() => setOverlay({ type: 'sleep' })} onOpenOutdoor={() => setOverlay({ type: 'outdoor' })} onOpenStats={() => setOverlay({ type: 'stats' })} onOptimizeDay={() => setOverlay({ type: 'optimize' })} />}{(tab === 'foods' || tab === 'add') && <FoodSearchScreen onSelect={(food) => openFood(food, selectedMeal)} onScan={() => { setFoodDate(todayKey()); setOverlay({ type: 'scan' }); }} />}{tab === 'journal' && <JournalScreen onAddFood={(meal, date) => { setSelectedMeal(meal); setFoodDate(date); setTab('add'); }} />}{tab === 'profile' && <ProfileScreen onOpenSettings={() => setOverlay({ type: 'settings' })} />}</View>;
  const statusStyle = overlay.type === 'scan' ? 'light' : theme.mode === 'dark' ? 'light' : 'dark';
  return <View style={{ flex: 1, backgroundColor: theme.bg }}><StatusBar style={statusStyle} /><PrimalAtmosphere />{overlay.type === 'none' ? <><View style={{ flex: 1 }}>{content}</View><TabBar active={tab} onTab={(next) => { if (next === 'foods') setFoodDate(todayKey()); setTab(next); }} onAdd={() => { setSelectedMeal('snack'); setFoodDate(todayKey()); setTab('add'); }} /></> : content}</View>;
}

export default function App() {
  const fontsReady = useAppFonts();
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: LIGHT.bg }}><StatusBar style="dark" /></View>;
  return <SafeAreaProvider><I18nProvider><ThemeProvider><StoreProvider><Root /></StoreProvider></ThemeProvider></I18nProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  tabDock: { paddingHorizontal: 14, paddingTop: 6, backgroundColor: 'transparent' },
  tabBar: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth, paddingTop: 9, paddingBottom: 9, paddingHorizontal: 4 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 50 }, tabIcon: { width: 48, height: 30, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' }, tabLabel: { fontSize: 11, marginTop: 4 },
  addButton: { width: 68, alignItems: 'center', justifyContent: 'flex-end', marginTop: -30 }, addOrb: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, alignItems: 'center', justifyContent: 'center' }, addGloss: { position: 'absolute', top: 4, left: 10, right: 10, height: 20, borderRadius: 12, backgroundColor: '#FFFFFF', opacity: 0.22 }, addLabel: { fontSize: 11, marginTop: 4 },
});
