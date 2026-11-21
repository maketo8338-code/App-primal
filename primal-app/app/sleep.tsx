import React from 'react';
import { useRouter } from 'expo-router';
import SleepScreen from '../src/screens/SleepScreen';

export default function Route() {
  const router = useRouter();
  return <SleepScreen onBack={() => router.back()} />;
}
