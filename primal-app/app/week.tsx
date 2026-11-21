import React from 'react';
import { useRouter } from 'expo-router';
import WeekSummaryScreen from '../src/week/WeekSummaryScreen';

export default function WeekRoute() {
  const router = useRouter();
  return <WeekSummaryScreen onBack={() => router.back()} />;
}
