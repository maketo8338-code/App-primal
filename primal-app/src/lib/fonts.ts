// Typography — modern geometric display + highly legible text + mono figures.
// All fonts: SIL Open Font License (Google Fonts), bundled with the app.
//   display → Space Grotesk (titles, big numbers)
//   text    → Inter (body, labels, buttons)
//   mono    → JetBrains Mono (figures, counters)
// React Native ignores `fontWeight` with custom fonts: always spread FONTS.x.y.
import type { TextStyle } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';

type FontSlots = { regular: TextStyle; semibold: TextStyle; bold: TextStyle };
type FontStyles = { display: FontSlots; text: FontSlots; mono: FontSlots };

export const FONT_SOURCES = {
  'AppDisplay-Regular': SpaceGrotesk_400Regular, 'AppDisplay-SemiBold': SpaceGrotesk_600SemiBold, 'AppDisplay-Bold': SpaceGrotesk_700Bold,
  'AppText-Regular': Inter_400Regular, 'AppText-SemiBold': Inter_600SemiBold, 'AppText-Bold': Inter_700Bold,
  'AppMono-Regular': JetBrainsMono_400Regular, 'AppMono-SemiBold': JetBrainsMono_600SemiBold, 'AppMono-Bold': JetBrainsMono_700Bold,
};

export const FONTS: FontStyles = {
  display: { regular: { fontFamily: 'AppDisplay-Regular' }, semibold: { fontFamily: 'AppDisplay-SemiBold' }, bold: { fontFamily: 'AppDisplay-Bold' } },
  text: { regular: { fontFamily: 'AppText-Regular' }, semibold: { fontFamily: 'AppText-SemiBold' }, bold: { fontFamily: 'AppText-Bold' } },
  mono: { regular: { fontFamily: 'AppMono-Regular' }, semibold: { fontFamily: 'AppMono-SemiBold' }, bold: { fontFamily: 'AppMono-Bold' } },
};

/** Loads fonts + icon font. Returns true when ready (or on error, never blocks the app). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ ...Ionicons.font, ...FONT_SOURCES });
  return loaded || error != null;
}
