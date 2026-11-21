import React from 'react';
import { useRouter } from 'expo-router';
import ScanScreen from '../src/screens/ScanScreen';
import { useSession } from '../src/navigation/session';
import { todayKey } from '../src/lib/nutrition';

export default function ScanRoute() {
  const router = useRouter(); const session = useSession();
  return <ScanScreen
    onFound={(food) => { session.setPending({ food, meal: session.selectedMeal }); router.replace('/food'); }}
    onClose={() => router.back()}
    onManualSearch={() => { router.back(); session.setFoodDate(todayKey()); router.navigate('/foods'); }}
  />;
}
