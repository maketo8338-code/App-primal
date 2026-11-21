import React from 'react';
import { Platform, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * Screens are transparent so the neon field shows through. On phones, inactive
 * tabs are detached natively; on the web they stay stacked underneath, so hide them.
 */
export function TabScene({ children }: { children: React.ReactNode }) {
  const focused = useIsFocused();
  return <View style={{ flex: 1, display: Platform.OS === 'web' && !focused ? 'none' : 'flex' }}>{children}</View>;
}
