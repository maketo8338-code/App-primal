import React from 'react';
import { useRouter } from 'expo-router';
import ProfileScreen from '../../src/screens/ProfileScreen';

export default function ProfileRoute() {
  const router = useRouter();
  return <ProfileScreen onOpenSettings={() => router.push('/settings')} />;
}
