import React from 'react';
import { useRouter } from 'expo-router';
import OutdoorScreen from '../src/screens/OutdoorScreen';

export default function Route() {
  const router = useRouter();
  return <OutdoorScreen onBack={() => router.back()} />;
}
