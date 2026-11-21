# PRIMAL — nutrition & santé

## Tester l'app
```bash
npm install
npx expo start        # puis scanne le QR code avec l'app Expo Go (iOS/Android)
npx expo start --web  # ou aperçu navigateur
```
Le design (thème « Terre & braise ») est centralisé dans `lib/theme.tsx`; les polices sont dans `assets/fonts/`.
Note : les notifications push distantes (`zzz/push.ts`) et les liens légaux (`zzz/legalLinks.ts`) pointent encore vers bloxks.app.
