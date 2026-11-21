import React from 'react';
import { useRouter } from 'expo-router';
import MicrosScreen from '../src/screens/MicrosScreen';

export default function Route() {
  const router = useRouter();
  return <MicrosScreen onBack={() => router.back()} />;
}
