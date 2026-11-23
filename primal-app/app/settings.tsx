import React from 'react';
import { useRouter } from '../src/navigation/useRouter';
import SettingsScreen from '../src/screens/SettingsScreen';

export default function Route() {
  const router = useRouter();
  return <SettingsScreen onBack={() => router.back()} />;
}
