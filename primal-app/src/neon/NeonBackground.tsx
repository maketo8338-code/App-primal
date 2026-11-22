import React from 'react';
import NeonField from './NeonField';
import GalaxyField from '../galaxy/GalaxyField';
import { hasSky, useTheme } from '../lib/theme';

/** Native: Skia is available immediately. Galaxy variants get their own starry sky. */
export default function NeonBackground() {
  const { ambience } = useTheme();
  return hasSky(ambience.accent) ? <GalaxyField key={ambience.accent} variant={ambience.accent} /> : <NeonField />;
}
