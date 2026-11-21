import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text as NativeText, View } from 'react-native';
import { I18nText as Text } from './components/I18nText';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './lib/theme';
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
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.tabButton, pressed && styles.tabPressed]}><View style={[styles.tabIcon, active && { backgroundColor: theme.primarySoft }]}><Icon name={tab.icon as any} android={tab.android as any} size={19} color={active ? theme.primary : theme.sub} /></View><Text style={[FONTS.text.semibold, styles.tabLabel, { color: active ? theme.primary : theme.sub }]}>{t(tab.labelKey)}</Text></Pressable>;
}

function TabBar({ active, onTab, onAdd }: { active: Tab; onTab: (tab: Tab) => void; onAdd: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return <View style={[styles.tabBar, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
    {tabs.slice(0, 2).map((tab) => <TabButton key={tab.id} tab={tab} active={active === tab.id} onPress={() => onTab(tab.id)} />)}
    <Pressable accessibilityLabel={t('foods.addTitle')} onPress={onAdd} style={({ pressed }) => [styles.addButton, { backgroundColor: theme.primary }, pressed && styles.addPressed]}><View style={styles.addInner}><Icon name="plus" android="add" size={25} color="#FFFFFF" /></View><Text style={[FONTS.text.semibold, styles.addLabel, { color: theme.primary }]}>{t('nav.add')}</Text></Pressable>
    {tabs.slice(2).map((tab) => <TabButton key={tab.id} tab={tab} active={active === tab.id} onPress={() => onTab(tab.id)} />)}
  </View>;
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
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: '#F5FAFF' }}><StatusBar style="dark" /></View>;
  return <SafeAreaProvider><I18nProvider><ThemeProvider><StoreProvider><Root /></StoreProvider></ThemeProvider></I18nProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, paddingTop: 8, shadowColor: '#174A7C', shadowOpacity: 0.065, shadowRadius: 22, shadowOffset: { width: 0, height: -7 }, elevation: 8 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 53 }, tabIcon: { width: 38, height: 29, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, tabLabel: { fontSize: 10, marginTop: 3 }, tabPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  addButton: { width: 64, height: 69, borderRadius: 32, marginTop: -34, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, shadowColor: '#2563EB', shadowOpacity: 0.24, shadowRadius: 17, shadowOffset: { width: 0, height: 7 }, elevation: 6 }, addInner: { width: 55, height: 55, borderRadius: 28, borderWidth: 5, borderColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' }, addLabel: { fontSize: 9, marginTop: -1 }, addPressed: { opacity: 0.9, transform: [{ scale: 0.95 }] },
});
