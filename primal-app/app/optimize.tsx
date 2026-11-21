import React from 'react';
import { useRouter } from 'expo-router';
import OptimizeDayScreen from '../src/screens/OptimizeDayScreen';
import { useSession } from '../src/navigation/session';
import { todayKey } from '../src/lib/nutrition';

export default function OptimizeRoute() {
  const router = useRouter(); const session = useSession();
  return <OptimizeDayScreen onBack={() => router.back()} onOpenFood={(food) => { session.setFoodDate(todayKey()); session.setPending({ food, meal: 'snack' }); router.push('/food'); }} />;
}
