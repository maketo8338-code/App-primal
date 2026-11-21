# PRIMAL 2 — nutrition & santé (version indépendante, sans Bloxks)

Thème unique « Néon braise » : fond noir, particules de lumière néon rouge qui
réagissent au toucher (onde de choc), au glissé, au défilement et aux
mouvements du téléphone (inclinaison, secousse).

## Tester sur ton téléphone (le plus simple)
1. Installe **Expo Go** (App Store / Google Play).
2. Sur ton ordinateur (Node.js 20+) :
   ```bash
   cd primal-app
   npm install
   npx expo start
   ```
3. Scanne le QR code avec l'appareil photo (iPhone) ou avec Expo Go (Android).

Aperçu navigateur : `npm run web` (copie le moteur graphique Skia puis ouvre le navigateur).

## Organisation
| Dossier | Contenu |
|---|---|
| `app/` | Écrans et navigation (Expo Router) |
| `src/lib/` | Logique métier reprise **à l'identique** de la v1 (calculs, base d'aliments, scores, i18n, stockage) |
| `src/lib/theme.tsx` | Couleurs, arrondis, ombres, néon — tout le design au même endroit |
| `src/neon/` | Moteur de particules (Skia + Reanimated, calcul sur le fil graphique) |
| `src/screens/`, `src/components/` | Interface |
| `src/config/legal.ts` | **À remplir** : tes liens Confidentialité / Conditions / Support |

## À faire avant publication sur les stores
- Renseigner `src/config/legal.ts` (obligatoire pour l'App Store et Google Play).
- Remplacer `assets/icon.png` (l'icône actuelle est l'ancienne, bleue).
- Créer un compte Expo et utiliser EAS Build (`npx eas build`) pour générer les binaires.
