# Consignes pour Claude — projet PRIMAL

## Coûts
- **Avant toute fonction payante** (Firecrawl : recherche web, lecture de données, scraping, agent ; toute API facturée à l'usage), **prévenir l'utilisateur, indiquer le coût estimé en crédits, et attendre son accord.**
- Les actions gratuites (parcourir un catalogue, lire un fichier fourni, outils locaux) ne demandent pas d'accord.
- Préférer une source gratuite quand elle existe, et la proposer en premier.

## Projet
- Application dans `primal-app/` (Expo SDK 54, Expo Router). Aperçu web partageable : `npm run preview:web`.
- La logique métier (`src/lib/`, sauf `theme.tsx`, `fonts.ts`, `appAssets.ts`) vient de la v1 : ne pas la modifier sans demande explicite.
- Base d'aliments : `tools/import-ciqual.py` (table Ciqual 2025, ANSES, Licence Ouverte — citer la source).
