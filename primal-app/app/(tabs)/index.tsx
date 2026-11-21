import React from 'react';
import { TabScene } from '../../src/navigation/TabScene';
import { useRouter } from 'expo-router';
import HomeScreen from '../../src/screens/HomeScreen';
import { useSession } from '../../src/navigation/session';
import { todayKey } from '../../src/lib/nutrition';

export default function HomeRoute() {
  const router = useRouter(); const session = useSession();
  return <TabScene><HomeScreen
    onAddFood={() => { session.setSelectedMeal('snack'); session.setFoodDate(todayKey()); router.navigate('/foods'); }}
    onOpenJournal={() => router.navigate('/journal')}
    onOpenMicros={() => router.push('/micros')}
    onOpenScore={() => router.push('/score')}
    onOpenHydration={() => router.push('/hydration')}
    onOpenActivity={() => router.push('/activity')}
    onOpenSleep={() => router.push('/sleep')}
    onOpenOutdoor={() => router.push('/outdoor')}
    onOpenStats={() => router.push('/stats')}
    onOptimizeDay={() => router.push('/optimize')}
    onShareDay={() => router.push('/share')}
    onOpenWeek={() => router.push('/week')}
    onOpenFood={(food) => { session.setFoodDate(todayKey()); session.setPending({ food, meal: 'snack' }); router.push('/food'); }}
  /></TabScene>;
}
