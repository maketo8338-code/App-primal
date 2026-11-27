# Google Play : formulaire « Sécurité des données » (brouillon pré-rempli)

Brouillon établi à partir du code de VISOLIS au 21/11/2026. À relire avant envoi.

## Collecte et partage
- **L'app collecte-t-elle ou partage-t-elle des données utilisateur ?** Non.
  - Toutes les données (profil, journal, santé et forme, photo de profil) restent sur l'appareil. Selon les définitions de Google, des données traitées uniquement sur l'appareil ne sont pas « collectées ».
  - Les recherches d'aliments et les codes-barres envoyés à Open Food Facts et à l'USDA ne contiennent aucune donnée personnelle. ⚠️ C'est le point à vérifier : si tu as un doute, déclare la section « Activité dans l'app → Recherches dans l'app », avec la mention « partagée, non liée à l'utilisateur ». C'est la déclaration la plus prudente.
- **Chiffrement en transit :** oui, toutes les requêtes passent en HTTPS.
- **Suppression des données :** l'utilisateur supprime tout en désinstallant l'app. Il n'existe pas de compte.

## Autres déclarations de la Play Console
- **Publicité :** l'app ne contient pas de publicité.
- **Applications de santé :** déclare-la dans la catégorie « Nutrition / suivi », sans fonction médicale.
- **Public cible :** 16 ans et plus. Recommandé, pour éviter les exigences de la règle « Familles ».
- **Permissions demandées :**
  - Caméra : scan de codes-barres.
  - Vibreur : intro et retours tactiles.
  - Internet : recherche d'aliments.
  - Le micro et le stockage externe sont bloqués volontairement.
- **Politique de confidentialité :** URL publique obligatoire. Héberge `legal/politique-confidentialite.md` et renseigne l'adresse dans `src/config/legal.ts` (`privacyUrl`).
