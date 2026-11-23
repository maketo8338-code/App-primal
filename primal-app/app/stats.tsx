import React from 'react';
import { useRouter } from '../src/navigation/useRouter';
import StatsScreen from '../src/screens/StatsScreen';

export default function Route() {
  const router = useRouter();
  return <StatsScreen onBack={() => router.back()} />;
}
