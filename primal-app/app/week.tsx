import React from 'react';
import { useRouter } from '../src/navigation/useRouter';
import WeekSummaryScreen from '../src/week/WeekSummaryScreen';

export default function WeekRoute() {
  const router = useRouter();
  return <WeekSummaryScreen onBack={() => router.back()} />;
}
