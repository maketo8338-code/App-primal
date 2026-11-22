// Everyday foods the suggestion engine may propose.
// The full base (3 000+ Ciqual foods) stays searchable; only suggestions are
// limited to foods people actually eat, in a realistic form (cooked meat,
// cooked legumes, no powders), so the coach never proposes 150 g of moringa.
import type { Food } from '../types';

export const normalizeName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe');

/** First words of everyday foods (accent-free, lower case). Matched at the start of the food name. */
const EVERYDAY = [
  // meat, fish, eggs
  'poulet', 'dinde', 'boeuf', 'steak', 'veau', 'porc', 'jambon', 'agneau', 'canard', 'lapin', 'foie de volaille',
  'saumon', 'thon', 'sardine', 'maquereau', 'cabillaud', 'colin', 'merlu', 'truite', 'dorade', 'bar', 'lieu', 'hareng', 'crevette', 'moule', 'huitre', 'calmar',
  'oeuf',
  // dairy
  'lait', 'yaourt', 'fromage blanc', 'skyr', 'petit-suisse', 'faisselle', 'emmental', 'comte', 'mozzarella', 'feta', 'parmesan', 'cottage', 'ricotta', 'kefir',
  // legumes, cereals, starches
  'lentille', 'pois chiche', 'haricot rouge', 'haricot blanc', 'feve', 'pois casse', 'edamame', 'tofu', 'tempeh',
  'riz', 'pates', 'quinoa', 'boulgour', 'semoule', 'flocon d\'avoine', 'flocons d\'avoine', 'avoine', 'sarrasin', 'pain complet', 'pain de seigle', 'pain', 'muesli',
  'pomme de terre', 'patate douce',
  // vegetables
  'brocoli', 'epinard', 'carotte', 'tomate', 'poivron', 'courgette', 'aubergine', 'haricot vert', 'petits pois', 'petit pois', 'chou', 'champignon', 'salade', 'laitue', 'mache', 'roquette',
  'concombre', 'betterave', 'poireau', 'oignon', 'asperge', 'artichaut', 'avocat', 'potiron', 'butternut', 'courge', 'fenouil', 'celeri', 'radis', 'navet', 'mais',
  // fruits
  'pomme', 'poire', 'banane', 'orange', 'clementine', 'mandarine', 'kiwi', 'fraise', 'framboise', 'myrtille', 'cerise', 'raisin', 'peche', 'nectarine', 'abricot', 'prune',
  'ananas', 'mangue', 'melon', 'pasteque', 'pamplemousse', 'citron', 'grenade', 'figue', 'datte', 'compote',
  // nuts, seeds, fats
  'amande', 'noix', 'noisette', 'noix de cajou', 'pistache', 'cacahuete', 'beurre de cacahuete', 'graine de chia', 'graines de chia', 'graine de lin', 'graine de courge', 'graine de tournesol', 'sesame',
  'huile d\'olive', 'huile de colza', 'beurre', 'chocolat noir',
];

const COOKED = /\b(cuit|cuite|cuits|cuites|grille|grillee|roti|rotie|vapeur|poele|poelee|four|bouilli|bouillie|braise|appertise|appertisee|en conserve|au naturel|fume|fumee|dur|poche|brouille|au plat)\b/;
const RAW_OR_DRY = /\b(cru|crue|crus|crues|sec|seche|secs|seches)\b/;
const NOT_REAL_LIFE = /\b(poudre|deshydrate|deshydratee|lyophilise|lyophilisee|concentre|extrait|infantile|bebe)\b/;
const NEEDS_COOKING = new Set(['MEAT', 'FISH_SEAFOOD', 'LEGUMES', 'CEREALS']);

export function isEverydayFood(food: Food): boolean {
  const name = normalizeName(food.name);
  if (NOT_REAL_LIFE.test(name)) return false;
  if (!EVERYDAY.some((w) => name === w || name.startsWith(`${w} `) || name.startsWith(`${w},`) || name.startsWith(`${w}s `) || name.startsWith(`${w}s,`) || name.startsWith(`${w}x`))) return false;
  // Meat, fish, legumes and grains are suggested cooked (or tinned/smoked), never raw or dry.
  if (NEEDS_COOKING.has(food.category)) {
    if (RAW_OR_DRY.test(name) && !COOKED.test(name)) return false;
    if (food.category !== 'CEREALS' && !COOKED.test(name) && food.source !== 'core') return false;
  }
  return true;
}
