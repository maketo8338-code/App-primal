import React from 'react';
import { useRouter } from 'expo-router';
import ActivityScreen from '../src/screens/ActivityScreen';

export default function Route() {
  const router = useRouter();
  return <ActivityScreen onBack={() => router.back()} />;
}
