import React from 'react';
import { useRouter } from 'expo-router';
import ScoreDetailScreen from '../src/screens/ScoreDetailScreen';

export default function Route() {
  const router = useRouter();
  return <ScoreDetailScreen onBack={() => router.back()} />;
}
