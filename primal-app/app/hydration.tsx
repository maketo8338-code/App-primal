import React from 'react';
import { useRouter } from 'expo-router';
import HydrationScreen from '../src/screens/HydrationScreen';

export default function Route() {
  const router = useRouter();
  return <HydrationScreen onBack={() => router.back()} />;
}
