import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconProps = {
  /** Kept for compatibility with screens written for SF Symbols (ignored). */
  name?: string;
  /** Ionicons name, rendered identically on iOS, Android and web. */
  android: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
};

/** One icon set (Ionicons) everywhere, so the neon look is identical on every platform. */
export function Icon({ android, size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name={android} size={size} color={color} />;
}
