import React from 'react';
import { useRouter } from '../src/navigation/useRouter';
import ActivityScreen from '../src/screens/ActivityScreen';

export default function Route() {
  const router = useRouter();
  return <ActivityScreen onBack={() => router.back()} />;
}
