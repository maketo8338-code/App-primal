import React from 'react';
import { useRouter } from '../src/navigation/useRouter';
import OutdoorScreen from '../src/screens/OutdoorScreen';

export default function Route() {
  const router = useRouter();
  return <OutdoorScreen onBack={() => router.back()} />;
}
