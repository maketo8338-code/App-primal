import React from 'react';
import { Redirect } from 'expo-router';
import { useRouter } from '../src/navigation/useRouter';
import FoodDetailScreen from '../src/screens/FoodDetailScreen';
import { useSession } from '../src/navigation/session';
import { useStore } from '../src/lib/store';

export default function FoodRoute() {
  const router = useRouter(); const session = useSession(); const { addEntry } = useStore();
  const pending = session.pending;
  if (!pending) return <Redirect href="/foods" />;
  const { food } = pending;
  return <FoodDetailScreen
    food={food}
    defaultMeal={pending.meal}
    onBack={() => router.back()}
    onAdd={(grams, meal) => {
      addEntry({ date: session.foodDate, meal, foodName: food.name, brand: food.brand, source: food.source, foodId: food.id, grams, per100: food.per100 });
      if (router.canDismiss()) router.dismissAll();
      router.navigate('/journal');
    }}
  />;
}
