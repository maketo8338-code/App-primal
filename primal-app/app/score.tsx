import React from 'react';
import { useRouter } from '../src/navigation/useRouter';
import ScoreDetailScreen from '../src/screens/ScoreDetailScreen';

export default function Route() {
  const router = useRouter();
  return <ScoreDetailScreen onBack={() => router.back()} />;
}
