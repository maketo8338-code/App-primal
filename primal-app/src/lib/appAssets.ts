import type { ImageSourcePropType } from 'react-native';
import { useTheme, type AccentId } from './theme';

// App logo shown inside the app, in the colour of the chosen ambience.
// Generated from assets/icon.png by tools/make-logos.py.
export const APP_ICONS: Record<AccentId, ImageSourcePropType> = {
  braise: require('../../assets/logo/logo-braise.png'),
  ambre: require('../../assets/logo/logo-ambre.png'),
  foret: require('../../assets/logo/logo-foret.png'),
  glacier: require('../../assets/logo/logo-glacier.png'),
  lune: require('../../assets/logo/logo-lune.png'),
  // Galaxie: provisional, until their own logos are generated (step 3).
  nebuleuse: require('../../assets/logo/logo-lune.png'),
  aurore: require('../../assets/logo/logo-foret.png'),
  supernova: require('../../assets/logo/logo-ambre.png'),
  trounoir: require('../../assets/logo/logo-lune.png'),
};

/** Default logo (Braise), kept for code that is not theme-aware. */
export const APP_ICON = APP_ICONS.braise;

/** Logo matching the ambience the user picked in Settings › Ambiance. */
export function useAppIcon(): ImageSourcePropType {
  const { ambience } = useTheme();
  return APP_ICONS[ambience.accent] ?? APP_ICON;
}
