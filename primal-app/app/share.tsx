import React from 'react';
import { useRouter } from '../src/navigation/useRouter';
import ShareDayScreen from '../src/share/ShareDayScreen';

export default function ShareRoute() {
  const router = useRouter();
  return <ShareDayScreen onBack={() => router.back()} />;
}
