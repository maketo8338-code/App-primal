/**
 * Politique de confidentialité de PRIMAL — source unique.
 * Affichée dans l'app (Réglages › Légal) et exportée en Markdown par
 * `node tools/export-privacy.mjs` → legal/politique-confidentialite.md.
 *
 * ⚠️ Brouillon rédigé à partir du fonctionnement réel du code : à faire relire
 * avant publication sur les stores,.
 */
export interface PolicySection { title: string; body: string[] }
export interface Policy { title: string; updated: string; intro: string; sections: PolicySection[] }

export const PRIVACY_UPDATED = '2026-11-21';

export const PRIVACY_FR: Policy = {
  title: 'Politique de confidentialité',
  updated: 'Dernière mise à jour : 21 novembre 2026',
  intro: 'PRIMAL est conçu pour fonctionner sans compte et sans serveur. Cette page explique, simplement, quelles données l’app utilise, où elles sont conservées et ce qui sort de ton téléphone.',
  sections: [
    { title: '1. Responsable', body: ['Éditeur de l’app : Suella.', 'Contact pour toute question sur tes données : primal.health.app@gmail.com.'] },
    { title: '2. Données que tu saisis', body: [
      'Profil : prénom, âge, sexe biologique, taille, poids, masse grasse (facultative), objectif, style alimentaire, activité habituelle, photo de profil (facultative).',
      'Journal : aliments et quantités, eau, pas, activités, sommeil, temps passé dehors.',
      'Réglages : langue, ambiance (couleur, particules, son, vibrations), préférences de rappels.',
      'Ces données servent uniquement à calculer tes repères (énergie, nutriments, score) et à afficher ton suivi.',
    ] },
    { title: '3. Où elles sont conservées', body: [
      'Tout est enregistré dans le stockage local de ton téléphone. PRIMAL n’a ni compte, ni serveur, ni base de données en ligne : nous ne recevons pas tes données.',
      'Supprimer l’app efface ces données. Pense à exporter une sauvegarde avant si tu veux les garder.',
    ] },
    { title: '4. Ce qui sort de ton téléphone', body: [
      'Recherche d’aliments en ligne : le texte que tu tapes peut être envoyé à Open Food Facts (world.openfoodfacts.org) et à l’USDA FoodData Central (api.nal.usda.gov) pour compléter les résultats.',
      'Scan de code-barres : le numéro du code-barres est envoyé à Open Food Facts pour retrouver la fiche produit.',
      'Ces requêtes ne contiennent ni ton profil ni ton journal. Ces services reçoivent techniquement ton adresse IP, comme pour toute connexion internet, et appliquent leur propre politique de confidentialité.',
      'Partage de ta journée : l’image n’est envoyée que si tu choisis toi-même une app (WhatsApp, Instagram…). Elle n’affiche jamais ton poids ni tes repas.',
    ] },
    { title: '5. Sauvegarde', body: [
      'L’export crée un fichier contenant ton profil, ton journal et tes réglages. C’est toi qui choisis où l’enregistrer ou l’envoyer (Fichiers, Drive, e-mail…). Ce fichier n’est pas chiffré : garde-le dans un endroit sûr.',
      'La restauration remplace les données présentes dans l’app par celles du fichier.',
    ] },
    { title: '6. Autorisations du téléphone', body: [
      'Appareil photo : uniquement pour lire un code-barres. Aucune image n’est enregistrée ni envoyée.',
      'Photos : uniquement si tu choisis une photo de profil. Elle reste sur ton téléphone.',
      'Notifications : rappels calculés et programmés sur le téléphone, jamais pendant tes heures calmes.',
      'Mouvement (accéléromètre) : uniquement pour animer les particules du fond. Aucune donnée n’est enregistrée.',
    ] },
    { title: '7. Ce que PRIMAL ne fait pas', body: [
      'Pas de publicité, pas de traceur publicitaire, pas d’outil de mesure d’audience.',
      'Pas de vente ni de location de données.',
      'Pas de connexion à Apple Santé, Health Connect ou une montre pour l’instant. Si cela arrive, cette page sera mise à jour avant.',
    ] },
    { title: '8. Données de santé', body: [
      'Certaines informations (poids, sommeil, alimentation) peuvent être considérées comme des données de santé. Elles restent sur ton appareil et ne sont jamais transmises à l’éditeur.',
      'PRIMAL est un outil de suivi : il ne pose pas de diagnostic et ne remplace pas un avis médical.',
    ] },
    { title: '9. Tes droits', body: [
      'Comme tes données sont sur ton téléphone, tu en gardes le contrôle : tu peux les modifier dans l’app, les exporter (sauvegarde) ou les effacer (en supprimant l’app).',
      'Pour toute question, écris au contact indiqué en section 1. Tu peux aussi saisir la CNIL (cnil.fr).',
    ] },
    { title: '10. Sources des données nutritionnelles', body: [
      'Table de composition nutritionnelle Ciqual 2025, ANSES (Licence Ouverte). Open Food Facts (ODbL). USDA FoodData Central (domaine public).',
    ] },
    { title: '11. Enfants', body: ['PRIMAL n’est pas destiné aux enfants de moins de 15 ans sans l’accord d’un parent.'] },
    { title: '12. Modifications', body: ['Si cette politique change, la date en haut de page sera mise à jour et le changement signalé dans l’app.'] },
  ],
};

export const PRIVACY_EN: Policy = {
  title: 'Privacy policy',
  updated: 'Last updated: 21 November 2026',
  intro: 'PRIMAL is designed to work without an account and without a server. This page explains, simply, which data the app uses, where it is kept and what leaves your phone.',
  sections: [
    { title: '1. Controller', body: ['App publisher: Suella.', 'Contact for any question about your data: primal.health.app@gmail.com.'] },
    { title: '2. Data you enter', body: [
      'Profile: first name, age, biological sex, height, weight, body fat (optional), goal, eating style, usual activity, profile photo (optional).',
      'Journal: foods and amounts, water, steps, activities, sleep, time outdoors.',
      'Settings: language, ambience (colour, particles, sound, vibrations), reminder preferences.',
      'This data is only used to compute your guidelines (energy, nutrients, score) and show your progress.',
    ] },
    { title: '3. Where it is kept', body: [
      'Everything is saved in your phone’s local storage. PRIMAL has no account, no server and no online database: we do not receive your data.',
      'Deleting the app erases this data. Export a backup first if you want to keep it.',
    ] },
    { title: '4. What leaves your phone', body: [
      'Online food search: the text you type may be sent to Open Food Facts (world.openfoodfacts.org) and USDA FoodData Central (api.nal.usda.gov) to complete the results.',
      'Barcode scan: the barcode number is sent to Open Food Facts to find the product.',
      'These requests contain neither your profile nor your journal. These services technically receive your IP address, as with any internet connection, and apply their own privacy policies.',
      'Sharing your day: the image is only sent if you choose an app yourself (WhatsApp, Instagram…). It never shows your weight or your meals.',
    ] },
    { title: '5. Backup', body: [
      'Export creates a file with your profile, journal and settings. You choose where to save or send it (Files, Drive, email…). The file is not encrypted: keep it somewhere safe.',
      'Restoring replaces the data in the app with the data in the file.',
    ] },
    { title: '6. Phone permissions', body: [
      'Camera: only to read a barcode. No image is saved or sent.',
      'Photos: only if you pick a profile photo. It stays on your phone.',
      'Notifications: reminders computed and scheduled on the phone, never during your quiet hours.',
      'Motion (accelerometer): only to animate the background particles. Nothing is recorded.',
    ] },
    { title: '7. What PRIMAL does not do', body: [
      'No ads, no ad trackers, no analytics.',
      'No selling or renting of data.',
      'No connection to Apple Health, Health Connect or a watch for now. If that changes, this page will be updated first.',
    ] },
    { title: '8. Health data', body: [
      'Some information (weight, sleep, food) may be considered health data. It stays on your device and is never sent to the publisher.',
      'PRIMAL is a tracking tool: it does not diagnose and does not replace medical advice.',
    ] },
    { title: '9. Your rights', body: [
      'Because your data is on your phone, you stay in control: you can edit it in the app, export it (backup) or erase it (by deleting the app).',
      'For any question, write to the contact in section 1. You can also contact your data protection authority (in France, the CNIL: cnil.fr).',
    ] },
    { title: '10. Nutrition data sources', body: [
      'Ciqual 2025 food composition table, ANSES (Licence Ouverte). Open Food Facts (ODbL). USDA FoodData Central (public domain).',
    ] },
    { title: '11. Children', body: ['PRIMAL is not intended for children under 15 without a parent’s consent.'] },
    { title: '12. Changes', body: ['If this policy changes, the date at the top will be updated and the change shown in the app.'] },
  ],
};

export function privacyFor(language: string): Policy { return language === 'fr' ? PRIVACY_FR : PRIVACY_EN; }

export function policyToMarkdown(policy: Policy): string {
  return [`# ${policy.title}`, '', `_${policy.updated}_`, '', policy.intro, '', ...policy.sections.flatMap((s) => [`## ${s.title}`, '', ...s.body.flatMap((p) => [p, '']), ''])].join('\n').replace(/\n{3,}/g, '\n\n');
}
