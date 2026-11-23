import React from 'react';
import { TabScene } from '../../src/navigation/TabScene';
import { useRouter } from '../../src/navigation/useRouter';
import ProfileScreen from '../../src/screens/ProfileScreen';

export default function ProfileRoute() {
  const router = useRouter();
  return <TabScene><ProfileScreen onOpenSettings={() => router.push('/settings')} /></TabScene>;
}
