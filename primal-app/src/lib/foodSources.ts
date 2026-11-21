import { Food, NutrientKey, Nutrients } from '../types';
import { normalizeFood } from './safeStorage';
import { CIQUAL_PROCESSED, FOOD_CORE } from './foodCore';
import { EXTRA_ALIASES } from './foodExtras';
import { withUsualPortion } from './portions';
import { CIQUAL_2025 } from './ciqual2025';

// Recherche multi-sources : noyau local instantané, USDA pour les génériques et Open Food Facts pour les produits de marque.
export function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const FR_EN: Record<string, string> = {
  poulet: 'chicken', volaille: 'chicken', boeuf: 'beef', porc: 'pork', agneau: 'lamb', dinde: 'turkey', veau: 'veal', jambon: 'ham', saucisse: 'sausage',
  foie: 'liver', coeur: 'heart', rognon: 'kidney', langue: 'tongue', saumon: 'salmon', thon: 'tuna', cabillaud: 'cod', morue: 'cod', sardine: 'sardine', maquereau: 'mackerel', truite: 'trout',
  crevette: 'shrimp', huitre: 'oyster', moule: 'mussel', calamar: 'squid', poulpe: 'octopus', poisson: 'fish', oeuf: 'egg', oeufs: 'egg', lait: 'milk', fromage: 'cheese', beurre: 'butter', yaourt: 'yogurt', creme: 'cream',
  pomme: 'apple', banane: 'banana', fraise: 'strawberry', framboise: 'raspberry', myrtille: 'blueberry', poire: 'pear', peche: 'peach', raisin: 'grape', citron: 'lemon', ananas: 'pineapple', mangue: 'mango', pasteque: 'watermelon', melon: 'melon',
  poivron: 'pepper', epinard: 'spinach', epinards: 'spinach', brocoli: 'broccoli', carotte: 'carrot', courgette: 'zucchini', aubergine: 'eggplant', concombre: 'cucumber', tomate: 'tomato', oignon: 'onion', ail: 'garlic', champignon: 'mushroom', chou: 'cabbage', salade: 'lettuce', laitue: 'lettuce',
  haricot: 'bean', haricots: 'beans', lentille: 'lentil', lentilles: 'lentils', pois: 'peas', riz: 'rice', avoine: 'oats', ble: 'wheat', pain: 'bread', pates: 'pasta', semoule: 'semolina', quinoa: 'quinoa',
  amande: 'almond', amandes: 'almonds', noix: 'walnut', noisette: 'hazelnut', cacahuete: 'peanut', graine: 'seed', graines: 'seeds', courge: 'pumpkin', tournesol: 'sunflower', lin: 'flax', huile: 'oil', olive: 'olive', colza: 'canola', avocat: 'avocado', patate: 'potato', douce: 'sweet', terre: '', miel: 'honey', chocolat: 'chocolate', sucre: 'sugar',
  cru: 'raw', crue: 'raw', crus: 'raw', crues: 'raw', cuit: 'cooked', cuite: 'cooked', cuits: 'cooked', cuites: 'cooked', entier: 'whole', entiere: 'whole', entierement: 'whole', demi: 'semi skimmed', ecreme: 'skimmed', pasteurise: 'pasteurized', uht: 'uht', frais: 'fresh', fume: 'smoked', grille: 'grilled', grillee: 'grilled', roti: 'roasted', rotie: 'roasted', vapeur: 'steamed', bouilli: 'boiled', bouillie: 'boiled', frit: 'fried', frite: 'fried', sec: 'dried', seche: 'dried',
};

const CORE_ALIASES: Record<string, string[]> = {
  'chicken-raw': ['blanc de poulet cru', 'escalope de poulet crue'], 'chicken-cooked': ['blanc de poulet cuit', 'poulet roti', 'escalope de poulet cuite'],
  'beef-raw': ['steak hache cru', 'viande hachee crue'], 'beef-cooked': ['steak hache cuit', 'viande hachee cuite'],
  'egg-boiled': ['oeuf cuit', 'oeuf dur'], 'egg-fried': ['oeuf au plat', 'oeuf frit'],
  'milk-uht': ['lait uht', 'lait demi ecreme'], 'milk-uht-whole': ['lait uht entier'], 'milk-raw': ['lait entier cru'],
  'white-fish-raw': ['poisson cru'], 'white-fish-cooked': ['poisson cuit'], 'beef-liver-raw': ['foie boeuf cru'], 'beef-liver-cooked': ['foie boeuf cuit'],
  'rice-white-raw': ['riz cru'], 'rice-white-cooked': ['riz cuit'], 'pasta-dry': ['pates crues', 'pates seches'], 'pasta-cooked': ['pates cuites'],
};

export function toEnglishQuery(query: string): string {
  return normalize(query).split(' ').map((word) => FR_EN[word] !== undefined ? FR_EN[word] : word).filter(Boolean).join(' ');
}

function tokenScore(token: string, candidate: string): number {
  if (candidate === token) return 5;
  if (candidate.startsWith(token) || token.startsWith(candidate)) return 3;
  if (candidate.includes(token)) return 2;
  if (token.length > 4 && levenshtein(token, candidate) <= 1) return 1;
  return 0;
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) { const temp = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = temp; }
  }
  return row[b.length];
}

const ADDED_PRIMAL_ALIASES: Record<string, string[]> = {
  'primal-128': ['datte', 'dattes'],
  'primal-129': ['riz', 'riz blanc'],
  'primal-130': ['pâtes', 'pates', 'pasta'],
  'primal-131': ['lentilles', 'lentille'],
  'primal-132': ['pain complet', 'pain intégral'],
  'primal-133': ['pain semi-complet', 'pain semi complet'],
  'primal-134': ['espadon'],
  'primal-135': ['papaye'],
  'primal-136': ['groseille'],
  'primal-137': ['litchi'],
  'primal-138': ['nectarine', 'brugnon'],
  'primal-139': ['fruit de la passion', 'maracudja', 'passion fruit'],
  'primal-140': ['pamplemousse', 'pomelo'],
  'primal-141': ['fruit du dragon', 'pitaya'],
  'primal-142': ['clémentine'],
  'primal-143': ['mandarine'],
  'primal-144': ['citron'],
  'primal-145': ['pastèque', 'pasteque'],
  'primal-146': ['goyave'],
};

// The base has ~2 500 foods: normalise each food's text once, not on every keystroke.
const SEARCH_TEXT = new Map<string, { text: string; tokens: string[] }>();
function searchIndex(food: Food): { text: string; tokens: string[] } {
  let entry = SEARCH_TEXT.get(food.id);
  if (!entry) { const text = searchableText(food); entry = { text, tokens: text.split(' ') }; SEARCH_TEXT.set(food.id, entry); }
  return entry;
}

function searchableText(food: Food): string {
  return normalize([food.name, food.category, ...(CORE_ALIASES[food.id.replace('core-', '')] || []), ...(ADDED_PRIMAL_ALIASES[food.id] || []), ...(EXTRA_ALIASES[food.id] || [])].join(' '));
}

const PRIMAL_CIQUAL_CODES = new Set(FOOD_CORE.map((food) => food.ciqualCode).filter((code): code is number => code !== undefined));
const CIQUAL_WITHOUT_PRIMAL_DUPLICATES = CIQUAL_2025.filter((food) => food.ciqualCode === undefined || !PRIMAL_CIQUAL_CODES.has(food.ciqualCode));

// Every food gets its usual portion (« 1 pomme ≈ 150 g ») instead of the generic 100 g.
export const PRIMAL_FOOD_BASE: Food[] = [...FOOD_CORE, ...CIQUAL_WITHOUT_PRIMAL_DUPLICATES, ...CIQUAL_PROCESSED].map(withUsualPortion);
/** Foods the day optimiser may suggest (per 100 g portion): whole foods only — no processed products, herbs/spices or flours. */
export const SUGGESTIBLE_FOOD_BASE: Food[] = PRIMAL_FOOD_BASE.filter((food) => food.category !== 'PROCESSED' && food.category !== 'HERBS_SPICES' && !/^(farine|fécule|amidon)\b/i.test(food.name));

export function searchCore(query: string): Food[] {
  const queryTokens = normalize(query).split(' ').filter(Boolean);
  if (!queryTokens.length) return PRIMAL_FOOD_BASE;
  return PRIMAL_FOOD_BASE.map((food) => {
    const { text, tokens } = searchIndex(food);
    const total = queryTokens.reduce((score, term) => score + Math.max(...tokens.map((token) => tokenScore(term, token)), 0), 0);
    const matched = queryTokens.filter((term) => tokens.some((token) => tokenScore(term, token) > 0)).length;
    const exactPhrase = text.includes(normalize(query));
    return { food, score: total + (exactPhrase ? 6 : 0), matched };
  }).filter((item) => item.matched === queryTokens.length || (queryTokens.length === 1 && item.score >= 2)).sort((a, b) => b.score - a.score).map((item) => item.food);
}

export function searchCiqual(query: string): Food[] {
  const queryTokens = normalize(query).split(' ').filter(Boolean);
  if (!queryTokens.length) return [];
  return CIQUAL_WITHOUT_PRIMAL_DUPLICATES.map((food) => {
    const text = normalize(food.name);
    const tokens = text.split(' ');
    const matched = queryTokens.filter((term) => tokens.some((token) => tokenScore(term, token) > 0)).length;
    const score = queryTokens.reduce((sum, term) => sum + Math.max(...tokens.map((token) => tokenScore(term, token)), 0), 0) + (text.includes(normalize(query)) ? 6 : 0);
    return { food, matched, score };
  }).filter((item) => item.matched === queryTokens.length || (queryTokens.length === 1 && item.score >= 2)).sort((a, b) => b.score - a.score).map((item) => item.food);
}

const USDA_MAP: Record<string, NutrientKey> = { '208': 'kcal', '203': 'protein', '205': 'carbs', '204': 'fat', '255': 'water', '291': 'fiber', '269': 'sugar', '606': 'satFat', '320': 'vitA', '404': 'vitB1', '405': 'vitB2', '406': 'vitB3', '410': 'vitB5', '415': 'vitB6', '416': 'vitB7', '417': 'vitB9', '418': 'vitB12', '401': 'vitC', '328': 'vitD', '323': 'vitE', '430': 'vitK', '301': 'calcium', '304': 'magnesium', '306': 'potassium', '307': 'sodium', '303': 'iron', '309': 'zinc', '312': 'copper', '315': 'manganese', '317': 'selenium', '314': 'iodine', '305': 'phosphorus' };
const USDA_OMEGA3 = ['851', '629', '621', '852', '855'];
const USDA_NAME_MAP: Record<string, NutrientKey> = { energy: 'kcal', protein: 'protein', carbohydrate: 'carbs', lipid: 'fat', water: 'water', fiber: 'fiber', sugars: 'sugar', 'fatty acids total saturated': 'satFat', calcium: 'calcium', iron: 'iron', magnesium: 'magnesium', phosphorus: 'phosphorus', potassium: 'potassium', sodium: 'sodium', zinc: 'zinc', copper: 'copper', manganese: 'manganese', selenium: 'selenium', iodine: 'iodine', 'vitamin c': 'vitC', 'vitamin a': 'vitA', 'vitamin d': 'vitD', 'vitamin e': 'vitE', 'vitamin k': 'vitK', thiamin: 'vitB1', riboflavin: 'vitB2', niacin: 'vitB3', 'pantothenic acid': 'vitB5', 'vitamin b-6': 'vitB6', folate: 'vitB9', 'vitamin b-12': 'vitB12', biotin: 'vitB7' };
const SEARCH_CACHE = new Map<string, { expiresAt: number; foods: Food[] }>();

function isRecord(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function safeText(value: unknown, max = 240): string | undefined { return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined; }
function safeNumber(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000 ? value : undefined; }

async function readJson(response: Response): Promise<unknown> {
  const length = response.headers.get('content-length');
  if (length && Number(length) > 2_000_000) throw new Error('response too large');
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error('response too large');
  try { return JSON.parse(body); } catch { throw new Error('invalid response'); }
}

function timeoutFetch(url: string, ms = 7000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function mapUsdaFood(item: any): Food | null {
  if (!isRecord(item) || !Array.isArray(item.foodNutrients)) return null;
  const description = safeText(item.description);
  const fdcId = safeText(String(item.fdcId ?? ''), 40);
  if (!description || !fdcId) return null;
  const per100: Nutrients = {}; let omega3 = 0; let hasOmega3 = false;
  item.foodNutrients.forEach((nutrient: any) => {
    if (!isRecord(nutrient)) return;
    const number = String(nutrient.nutrientNumber ?? (isRecord(nutrient.nutrient) ? nutrient.nutrient.number : '') ?? '');
    const value = safeNumber(nutrient.value) ?? safeNumber(nutrient.amount);
    if (value === undefined) return;
    const name = normalize(String(nutrient.nutrientName ?? (isRecord(nutrient.nutrient) ? nutrient.nutrient.name : '') ?? ''));
    const key = USDA_MAP[number] ?? USDA_NAME_MAP[name];
    if (key && per100[key] === undefined) per100[key] = value;
    if (USDA_OMEGA3.includes(number) || name.includes('omega 3')) { omega3 += value; hasOmega3 = true; }
  });
  if (hasOmega3) per100.omega3 = Math.min(1_000_000_000, Math.round(omega3 * 100) / 100);
  if (per100.kcal === undefined) return null;
  return normalizeFood({ id: `usda-${fdcId}`, source: 'usda', name: description, brand: safeText(item.brandOwner) || safeText(item.brandName), category: safeText(item.foodCategory) || safeText(item.dataType) || 'USDA', portionLabel: '100 g', portionGrams: 100, per100 });
}

export async function searchUsda(query: string): Promise<Food[]> {
  const english = toEnglishQuery(query).slice(0, 120); if (!english) return [];
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&pageSize=25&dataType=${encodeURIComponent('Foundation,SR Legacy,Branded')}&query=${encodeURIComponent(english)}`;
  const response = await timeoutFetch(url); if (!response.ok) throw new Error(`usda ${response.status}`);
  const json = await readJson(response);
  if (!isRecord(json) || !Array.isArray(json.foods)) return [];
  return json.foods.map(mapUsdaFood).filter(Boolean) as Food[];
}

const OFF_FIELDS: { off: string; key: NutrientKey; factor: number }[] = [
  { off: 'energy-kcal_100g', key: 'kcal', factor: 1 }, { off: 'water_100g', key: 'water', factor: 1 }, { off: 'proteins_100g', key: 'protein', factor: 1 }, { off: 'carbohydrates_100g', key: 'carbs', factor: 1 }, { off: 'fat_100g', key: 'fat', factor: 1 }, { off: 'fiber_100g', key: 'fiber', factor: 1 }, { off: 'sugars_100g', key: 'sugar', factor: 1 }, { off: 'saturated-fat_100g', key: 'satFat', factor: 1 }, { off: 'omega-3-fat_100g', key: 'omega3', factor: 1 }, { off: 'sodium_100g', key: 'sodium', factor: 1000 }, { off: 'calcium_100g', key: 'calcium', factor: 1000 }, { off: 'iron_100g', key: 'iron', factor: 1000 }, { off: 'magnesium_100g', key: 'magnesium', factor: 1000 }, { off: 'potassium_100g', key: 'potassium', factor: 1000 }, { off: 'zinc_100g', key: 'zinc', factor: 1000 }, { off: 'phosphorus_100g', key: 'phosphorus', factor: 1000 }, { off: 'copper_100g', key: 'copper', factor: 1000 }, { off: 'manganese_100g', key: 'manganese', factor: 1000 }, { off: 'vitamin-c_100g', key: 'vitC', factor: 1000 }, { off: 'vitamin-b1_100g', key: 'vitB1', factor: 1000 }, { off: 'vitamin-b2_100g', key: 'vitB2', factor: 1000 }, { off: 'vitamin-pp_100g', key: 'vitB3', factor: 1000 }, { off: 'pantothenic-acid_100g', key: 'vitB5', factor: 1000 }, { off: 'vitamin-b6_100g', key: 'vitB6', factor: 1000 }, { off: 'vitamin-e_100g', key: 'vitE', factor: 1000 }, { off: 'vitamin-a_100g', key: 'vitA', factor: 1000000 }, { off: 'vitamin-d_100g', key: 'vitD', factor: 1000000 }, { off: 'vitamin-b12_100g', key: 'vitB12', factor: 1000000 }, { off: 'folates_100g', key: 'vitB9', factor: 1000000 }, { off: 'vitamin-k_100g', key: 'vitK', factor: 1000000 }, { off: 'biotin_100g', key: 'vitB7', factor: 1000000 }, { off: 'selenium_100g', key: 'selenium', factor: 1000000 }, { off: 'iodine_100g', key: 'iodine', factor: 1000000 },
];

function mapOffProduct(product: any): Food | null {
  if (!isRecord(product) || !isRecord(product.nutriments)) return null;
  const name = safeText(product.product_name_fr) || safeText(product.product_name);
  const code = safeText(String(product.code ?? ''), 40);
  if (!name || !code) return null;
  const per100: Nutrients = {};
  OFF_FIELDS.forEach(({ off, key, factor }) => {
    const value = safeNumber(product.nutriments[off]);
    if (value !== undefined) per100[key] = Math.min(1_000_000_000, value * factor);
  });
  if (per100.kcal === undefined) return null;
  const parsedServing = typeof product.serving_quantity === 'number' ? product.serving_quantity : Number.parseFloat(String(product.serving_quantity ?? ''));
  const grams = Number.isFinite(parsedServing) && parsedServing > 0 && parsedServing <= 100000 ? parsedServing : 100;
  const brands = Array.isArray(product.brands) ? product.brands.find((brand: unknown) => typeof brand === 'string') : product.brands;
  return normalizeFood({ id: `off-${code}`, source: 'off', name, brand: safeText(brands)?.split(',')[0].trim() || undefined, category: 'Produits', portionLabel: grams === 100 ? '100 g' : `1 portion (${Math.round(grams)} g)`, portionGrams: grams, per100 });
}

export async function searchOff(query: string): Promise<Food[]> {
  const boundedQuery = query.slice(0, 120);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1&search_simple=1&page_size=25&fields=code,product_name,product_name_fr,brands,nutriments,serving_quantity&search_terms=${encodeURIComponent(boundedQuery)}`;
  const response = await timeoutFetch(url); if (!response.ok) throw new Error(`off ${response.status}`);
  const json = await readJson(response);
  if (!isRecord(json) || !Array.isArray(json.products)) return [];
  return json.products.map(mapOffProduct).filter(Boolean) as Food[];
}

export async function fetchBarcode(code: string): Promise<Food | null> {
  const normalizedCode = code.replace(/\D/g, '').slice(0, 14);
  if (!/^\d{8,14}$/.test(normalizedCode)) return null;
  const response = await timeoutFetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedCode)}.json`);
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const json = await readJson(response);
  return isRecord(json) && json.status === 1 && isRecord(json.product) ? mapOffProduct(json.product) : null;
}

function formOf(food: Food): string {
  const text = normalize(food.name); const forms = ['raw', 'cru', 'cooked', 'cuit', 'grilled', 'grille', 'roasted', 'roti', 'boiled', 'bouilli', 'fried', 'frit', 'uht', 'pasteurized', 'pasteurise'];
  return forms.find((form) => text.includes(form)) || 'standard';
}
function canonicalBase(food: Food): string {
  const text = toEnglishQuery(food.name);
  const has = (...terms: string[]) => terms.some((term) => text.includes(term));
  if (has('chicken')) return has('thigh') ? 'chicken thigh' : has('breast', 'blanc') ? 'chicken breast' : 'chicken';
  if (has('beef')) return has('liver') ? 'beef liver' : has('ground', 'hache') ? 'ground beef' : has('steak') ? 'beef steak' : 'beef';
  if (has('pork')) return has('chop', 'cote') ? 'pork chop' : 'pork';
  if (has('turkey')) return 'turkey breast';
  if (has('salmon', 'cod', 'tuna', 'sardine', 'shrimp', 'oyster', 'mussel', 'egg', 'zucchini', 'broccoli', 'spinach', 'carrot', 'tomato', 'avocado', 'banana', 'apple', 'orange', 'kiwi', 'strawberry', 'blueberry', 'quinoa', 'lentil', 'chickpea', 'tofu', 'almond', 'walnut', 'cashew', 'mozzarella', 'emmental', 'camembert', 'parmesan')) return text.split(' ').find((word) => ['salmon', 'cod', 'tuna', 'sardine', 'shrimp', 'oyster', 'mussel', 'egg', 'zucchini', 'broccoli', 'spinach', 'carrot', 'tomato', 'avocado', 'banana', 'apple', 'orange', 'kiwi', 'strawberry', 'blueberry', 'quinoa', 'lentil', 'chickpea', 'tofu', 'almond', 'walnut', 'cashew', 'mozzarella', 'emmental', 'camembert', 'parmesan'].includes(word)) || text;
  if (has('milk')) return has('whole') ? 'whole milk' : has('semi', 'skimmed') ? 'semi skimmed milk' : 'milk';
  return normalize(text).replace(/\b(foundation|sr legacy|survey fndds|food data central|raw|cooked|grilled|roasted|boiled|fried|uht|pasteurized)\b/g, '').replace(/\s+/g, ' ').trim();
}
function dedupeKey(food: Food): string {
  if ((food.source === 'core' || food.source === 'ciqual') && food.ciqualCode !== undefined) return `${food.source}:${food.ciqualCode}`;
  return `${canonicalBase(food)}|${normalize(food.brand || '')}|${formOf(food)}`;
}

function relevance(food: Food, query: string): number {
  const french = normalize(query); const english = toEnglishQuery(query); const text = normalize(`${food.name} ${food.brand || ''} ${food.category}`);
  const words = french.split(' ').filter(Boolean); const translatedWords = english.split(' ').filter(Boolean);
  const matched = words.filter((word) => text.split(' ').some((candidate) => tokenScore(word, candidate) > 0)).length;
  const translatedMatched = translatedWords.filter((word) => text.split(' ').some((candidate) => tokenScore(word, candidate) > 0)).length;
  const exact = text.includes(french) || text.includes(english);
  const sourceBoost = food.source === 'core' ? 8 : food.source === 'usda' ? 5 : 3;
  return (exact ? 100 : 0) + matched * 14 + translatedMatched * 10 + sourceBoost;
}

export interface SearchOutcome { results: Food[]; onlineOk: boolean; }
export async function searchFoods(query: string): Promise<SearchOutcome> {
  const boundedQuery = query.slice(0, 120);
  const normalizedQuery = normalize(boundedQuery); const core = searchCore(boundedQuery); const ciqual = searchCiqual(boundedQuery); if (!normalizedQuery) return { results: core, onlineOk: true };
  const cached = SEARCH_CACHE.get(normalizedQuery); if (cached && cached.expiresAt > Date.now()) return { results: cached.foods, onlineOk: true };
  const settled = await Promise.allSettled([searchUsda(boundedQuery), searchOff(boundedQuery)]);
  const usda = settled[0].status === 'fulfilled' ? settled[0].value : [];
  const off = settled[1].status === 'fulfilled' ? settled[1].value : [];
  const merged = new Map<string, Food>();
  [...core, ...ciqual, ...usda, ...off].forEach((food) => {
    const key = dedupeKey(food); const current = merged.get(key);
    if (!current) { merged.set(key, food); return; }
    const preferred = current.source === 'core' || food.source !== 'core' ? current : food;
    const supplement = preferred === current ? food : current;
    merged.set(key, { ...preferred, ciqualCode: preferred.ciqualCode ?? supplement.ciqualCode, ciqualRaw: preferred.ciqualRaw ?? supplement.ciqualRaw, per100: { ...supplement.per100, ...preferred.per100 } });
  });
  const ranked = Array.from(merged.values()).sort((a, b) => relevance(b, boundedQuery) - relevance(a, boundedQuery));
  if (SEARCH_CACHE.size >= 50) {
    const oldest = SEARCH_CACHE.keys().next().value;
    if (typeof oldest === 'string') SEARCH_CACHE.delete(oldest);
  }
  SEARCH_CACHE.set(normalizedQuery, { foods: ranked, expiresAt: Date.now() + 5 * 60 * 1000 });
  return { results: ranked, onlineOk: settled.some((item) => item.status === 'fulfilled') };
}

export const SOURCE_LABEL: Record<string, string> = { core: 'Base PRIMAL', usda: 'USDA FoodData Central', off: 'Open Food Facts', ciqual: 'Ciqual 2025 — ANSES' };
