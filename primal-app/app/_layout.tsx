import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, ThemeProvider as NavigationTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../src/lib/i18n';
import { ThemeProvider, useTheme } from '../src/lib/theme';
import { StoreProvider, useStore } from '../src/lib/store';
import { syncSmartNotifications } from '../src/lib/notificationEngine';
import { useAppFonts } from '../src/lib/fonts';
import { SessionProvider } from '../src/navigation/session';
import { NeonProvider } from '../src/neon/NeonProvider';
import NeonBackground from '../src/neon/NeonBackground';
import LanguageSelectionScreen from '../src/screens/LanguageSelectionScreen';
import OnboardingScreen from '../src/screens/OnboardingScreen';


export default function RootLayout() {
  const fontsReady = useAppFonts();
  if (!fontsReady) return <View style={styles.black}><StatusBar style="light" /></View>;
  return <SafeAreaProvider><I18nProvider><ThemeProvider><StoreProvider><SessionProvider><NeonProvider><Root /></NeonProvider></SessionProvider></StoreProvider></ThemeProvider></I18nProvider></SafeAreaProvider>;
}

function Root() {
  const { theme, ambience } = useTheme();
  const navigationTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent', card: theme.cardSolid, primary: theme.primary, text: theme.text, border: theme.border } };
  const { ready: i18nReady, languageChosen } = useI18n();
  const { ready, entries, habits, profile, notificationPreferences } = useStore();

  useEffect(() => {
    if (!ready) return;
    void syncSmartNotifications({ entries, habits, targets: profile.targets, preferences: notificationPreferences }).catch(() => undefined);
  }, [ready, entries, habits, profile.targets, notificationPreferences]);

  // Same gating as before: language → onboarding → app.
  const gate = !i18nReady || !ready ? 'loading' : !profile.onboarded && !languageChosen ? 'language' : !profile.onboarded ? 'onboarding' : 'app';

  // As before: nothing is mounted until saved data is loaded, so forms start with the real profile.
  if (gate === 'loading') return <View style={styles.black}><StatusBar style="light" /></View>;

  return <NavigationTheme value={navigationTheme}><View style={styles.black}>
    <StatusBar style="light" />
    {gate === 'app' && ambience.enabled ? <NeonBackground /> : null}
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#050505' } }} />
    </Stack>
    {gate !== 'app' ? <View style={[StyleSheet.absoluteFill, styles.black]}>{ambience.enabled ? <NeonBackground /> : null}{gate === 'language' ? <LanguageSelectionScreen /> : gate === 'onboarding' ? <OnboardingScreen /> : null}</View> : null}
  </View></NavigationTheme>;
}

const styles = StyleSheet.create({ black: { flex: 1, backgroundColor: '#050505' } });
