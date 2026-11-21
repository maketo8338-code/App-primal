import React from 'react';
import { useRouter } from 'expo-router';
import JournalScreen from '../../src/screens/JournalScreen';
import { useSession } from '../../src/navigation/session';

export default function JournalRoute() {
  const router = useRouter(); const session = useSession();
  return <JournalScreen onAddFood={(meal, date) => { session.setSelectedMeal(meal); session.setFoodDate(date); router.navigate('/foods'); }} />;
}
