import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../lib/i18n';
import { ThemeProvider, useTheme } from '../lib/theme';
import { StoreProvider, useStore } from '../lib/store';
import { syncSmartNotifications } from '../lib/notificationEngine';
import { useAppFonts } from '../lib/fonts';
import { todayKey } from '../lib/nutrition';
import { SessionProvider, useSession } from '../navigation/session';
import NeonTabBar from '../navigation/NeonTabBar';
import { NeonProvider } from '../neon/NeonProvider';
import NeonBackground from '../neon/NeonBackground';
import IntroOverlay from '../intro/IntroOverlay';
import HomeScreen from '../screens/HomeScreen';
import FoodSearchScreen from '../screens/FoodSearchScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';
import JournalScreen from '../screens/JournalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MicrosScreen from '../screens/MicrosScreen';
import ScoreDetailScreen from '../screens/ScoreDetailScreen';
import HydrationScreen from '../screens/HydrationScreen';
import ActivityScreen from '../screens/ActivityScreen';
import SleepScreen from '../screens/SleepScreen';
import OutdoorScreen from '../screens/OutdoorScreen';
import StatsScreen from '../screens/StatsScreen';
import OptimizeDayScreen from '../screens/OptimizeDayScreen';
import ScanScreen from '../screens/ScanScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import ShareDayScreen from '../share/ShareDayScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Shareable web preview of PRIMAL 2.
// Same screens, theme and particles as the real app, but navigation is kept in
// state (like the v1 App.tsx) instead of in the URL, so the preview works from
// any link. The phone app itself uses Expo Router (see app/).
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'index' | 'foods' | 'journal' | 'profile';
type Overlay = 'none' | 'share' | 'food' | 'scan' | 'settings' | 'micros' | 'score' | 'hydration' | 'activity' | 'sleep' | 'outdoor' | 'stats' | 'optimize';

export default function PreviewApp() {
  const fontsReady = useAppFonts();
  if (!fontsReady) return <View style={styles.black} />;
  return <SafeAreaProvider><I18nProvider><ThemeProvider><StoreProvider><SessionProvider><NeonProvider><Root /><IntroOverlay /></NeonProvider></SessionProvider></StoreProvider></ThemeProvider></I18nProvider></SafeAreaProvider>;
}

function Root() {
  const { ready: i18nReady, languageChosen } = useI18n();
  const { ready, entries, habits, profile, notificationPreferences, addEntry } = useStore();
  const session = useSession();
  const { ambience } = useTheme();
  const [tab, setTab] = useState<Tab>('index');
  const [overlay, setOverlay] = useState<Overlay>('none');

  useEffect(() => {
    if (!ready) return;
    void syncSmartNotifications({ entries, habits, targets: profile.targets, preferences: notificationPreferences }).catch(() => undefined);
  }, [ready, entries, habits, profile.targets, notificationPreferences]);

  if (!i18nReady || !ready) return <View style={styles.black} />;
  const close = () => setOverlay('none');
  const goFoods = () => { setOverlay('none'); setTab('foods'); };

  let content: React.ReactNode;
  if (!profile.onboarded) content = !languageChosen ? <LanguageSelectionScreen /> : <OnboardingScreen />;
  else if (overlay === 'food' && session.pending) {
    const { food } = session.pending;
    content = <FoodDetailScreen food={food} defaultMeal={session.pending.meal} onBack={close} onAdd={(grams, meal) => { addEntry({ date: session.foodDate, meal, foodName: food.name, brand: food.brand, source: food.source, foodId: food.id, grams, per100: food.per100 }); setOverlay('none'); setTab('journal'); }} />;
  }
  else if (overlay === 'scan') content = <ScanScreen onFound={(food) => { session.setPending({ food, meal: session.selectedMeal }); setOverlay('food'); }} onClose={close} onManualSearch={() => { session.setFoodDate(todayKey()); goFoods(); }} />;
  else if (overlay === 'share') content = <ShareDayScreen onBack={close} />;
  else if (overlay === 'settings') content = <SettingsScreen onBack={close} />;
  else if (overlay === 'micros') content = <MicrosScreen onBack={close} />;
  else if (overlay === 'score') content = <ScoreDetailScreen onBack={close} />;
  else if (overlay === 'hydration') content = <HydrationScreen onBack={close} />;
  else if (overlay === 'activity') content = <ActivityScreen onBack={close} />;
  else if (overlay === 'sleep') content = <SleepScreen onBack={close} />;
  else if (overlay === 'outdoor') content = <OutdoorScreen onBack={close} />;
  else if (overlay === 'stats') content = <StatsScreen onBack={close} />;
  else if (overlay === 'optimize') content = <OptimizeDayScreen onBack={close} onOpenFood={(food) => { session.setFoodDate(todayKey()); session.setPending({ food, meal: 'snack' }); setOverlay('food'); }} />;
  else {
    const screen = tab === 'index'
      ? <HomeScreen onAddFood={() => { session.setSelectedMeal('snack'); session.setFoodDate(todayKey()); setTab('foods'); }} onOpenJournal={() => setTab('journal')} onOpenMicros={() => setOverlay('micros')} onOpenScore={() => setOverlay('score')} onOpenHydration={() => setOverlay('hydration')} onOpenActivity={() => setOverlay('activity')} onOpenSleep={() => setOverlay('sleep')} onOpenOutdoor={() => setOverlay('outdoor')} onOpenStats={() => setOverlay('stats')} onOptimizeDay={() => setOverlay('optimize')} onShareDay={() => setOverlay('share')} />
      : tab === 'foods'
        ? <FoodSearchScreen onSelect={(food) => { session.setPending({ food, meal: session.selectedMeal }); setOverlay('food'); }} onScan={() => { session.setFoodDate(todayKey()); setOverlay('scan'); }} />
        : tab === 'journal'
          ? <JournalScreen onAddFood={(meal, date) => { session.setSelectedMeal(meal); session.setFoodDate(date); setTab('foods'); }} />
          : <ProfileScreen onOpenSettings={() => setOverlay('settings')} />;
    // The real tab bar, fed with a minimal stand-in for the navigator it normally talks to.
    const routes = (['index', 'foods', 'journal', 'profile'] as Tab[]).map((name) => ({ key: name, name }));
    const tabBarProps = {
      state: { index: routes.findIndex((r) => r.name === tab), routes },
      navigation: { emit: () => ({ defaultPrevented: false }), navigate: (name: Tab) => setTab(name) },
    } as unknown as React.ComponentProps<typeof NeonTabBar>;
    content = <><View style={{ flex: 1 }} key={tab}>{screen}</View><NeonTabBar {...tabBarProps} /></>;
  }

  return <View style={styles.black}>
    <StatusBar style="light" />
    {ambience.enabled ? <NeonBackground /> : null}
    <View style={{ flex: 1 }}>{content}</View>
  </View>;
}

const styles = StyleSheet.create({ black: { flex: 1, backgroundColor: '#050505' } });
