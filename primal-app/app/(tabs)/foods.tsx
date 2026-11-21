import React from 'react';
import { useRouter } from 'expo-router';
import FoodSearchScreen from '../../src/screens/FoodSearchScreen';
import { useSession } from '../../src/navigation/session';
import { todayKey } from '../../src/lib/nutrition';

export default function FoodsRoute() {
  const router = useRouter(); const session = useSession();
  return <FoodSearchScreen
    onSelect={(food) => { session.setPending({ food, meal: session.selectedMeal }); router.push('/food'); }}
    onScan={() => { session.setFoodDate(todayKey()); router.push('/scan'); }}
  />;
}
