import type { Food } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Usual portions (« 1 pomme ≈ 150 g », « 1 pot de yaourt 125 g »…).
// Ciqual gives values per 100 g but no portion sizes: these are ESTIMATES of
// common French household portions (edible part), by food type. The user can
// always adjust the grams. Rules are tried in order: the first match wins.
// ─────────────────────────────────────────────────────────────────────────────

type Rule = [RegExp, number, string];

const R = (pattern: string): RegExp => new RegExp(pattern);

const RULES: Rule[] = [
  // Fats, sweeteners, spreads (tiny portions first so « huile d'olive » is not « olive »)
  [R('^(huile|graisse)\\b'), 10, '1 c. à soupe'],
  [R('^(beurre|ghee)\\b'), 10, '1 noisette'],
  [R('^creme\\b.*\\b(fraiche|epaisse|liquide|legere|entiere)\\b|^creme entiere'), 15, '1 c. à soupe'],
  [R('^miel\\b'), 7, '1 c. à café'],
  [R('^sirop\\b'), 15, '1 c. à soupe'],
  [R('^sucre\\b'), 5, '1 morceau'],
  [R('^(confiture|gelee|marmelade)\\b'), 15, '1 c. à soupe'],
  [R('^(sel|poivre)\\b'), 1, '1 pincée'],
  // Eggs
  [R('^oeuf de caille'), 10, '1 œuf de caille'],
  [R('^oeuf.*\\bjaune\\b'), 18, '1 jaune'],
  [R('^oeuf.*\\bblanc\\b'), 33, '1 blanc'],
  [R('^oeuf'), 50, '1 œuf'],
  // Dairy
  [R('^lait\\b.*\\b(poudre|deshydrate)\\b'), 25, '2 c. à soupe'],
  [R('^lait\\b.*\\bconcentre\\b'), 30, '2 c. à soupe'],
  [R('^(lait|kefir|lait fermente a boire|babeurre)\\b'), 250, '1 bol (250 ml)'],
  [R('^(yaourt|yogourt|lait fermente)\\b'), 125, '1 pot'],
  [R('^skyr\\b'), 150, '1 pot'],
  [R('^faisselle\\b'), 100, '1 faisselle'],
  [R('petit suisse'), 60, '1 petit-suisse'],
  [R('^fromage blanc\\b'), 100, '1 portion'],
  [R('^(parmesan|grana)\\b'), 10, '1 c. à soupe râpée'],
  [R('^mozzarella\\b'), 125, '1 boule'],
  [R('^(fromage|camembert|brie|comte|emmental|mimolette|roquefort|chevre|reblochon|raclette|coulommiers|saint (nectaire|marcellin|felicien|paulin|agur|albray)|tomme|cantal|morbier|munster|beaufort|gruyere|feta|asiago|fontina|bleu d|bleu de|maroilles|ossau|abondance|mont d or|pont l eveque|livarot|epoisses|carre de l est|edam|gouda|cheddar|ricotta|mascarpone)'), 30, '1 portion'],
  // Fruits (edible part)
  [R('^(pomme|pommes)\\b(?! de terre)'), 150, '1 pomme'],
  [R('^poire\\b'), 160, '1 poire'],
  [R('^banane\\b'), 120, '1 banane'],
  [R('^(orange|pomelo|pamplemousse)\\b'), 150, '1 fruit (chair)'],
  [R('^(clementine|mandarine)\\b'), 60, '1 clémentine'],
  [R('^kiwi\\b'), 75, '1 kiwi'],
  [R('^(peche|nectarine|brugnon)\\b'), 130, '1 pêche'],
  [R('^abricot.*\\bsec'), 8, '1 abricot sec'],
  [R('^abricot\\b'), 40, '1 abricot'],
  [R('^pruneau\\b|^prune.*\\bsec'), 10, '1 pruneau'],
  [R('^(prune|mirabelle|quetsche|reine claude)\\b'), 35, '1 prune'],
  [R('^datte\\b'), 8, '1 datte'],
  [R('^figue.*\\bsec'), 20, '1 figue sèche'],
  [R('^figue\\b'), 50, '1 figue'],
  [R('^raisin.*\\bsec|^raisins secs'), 30, '1 poignée'],
  [R('^raisin\\b'), 125, '1 grappe'],
  [R('^(fraise|framboise|myrtille|mure|groseille|cassis|canneberge|airelle|cerise|griotte)\\b'), 125, '1 bol'],
  [R('^(mangue)\\b'), 150, '1/2 mangue'],
  [R('^ananas\\b'), 120, '2 tranches'],
  [R('^(melon|pasteque)\\b'), 200, '1 tranche'],
  [R('^avocat\\b'), 100, '1/2 avocat'],
  [R('^(citron|lime)\\b'), 60, '1 citron'],
  [R('^litchi\\b'), 10, '1 litchi'],
  [R('^(grenade)\\b'), 100, '1/2 grenade'],
  [R('^fruit de la passion\\b'), 20, '1 fruit'],
  [R('^(papaye|goyave|kaki|coing|mangoustan|corossol|sapotille|carambole|ramboutan|dourian|durian|jacque|fruit du dragon|pitaya)\\b'), 120, '1 portion'],
  [R('^noix de coco.*\\b(sech|rape)'), 15, '1 c. à soupe'],
  [R('^noix de coco\\b'), 40, '1 morceau'],
  // Nuts & seeds
  [R('^(graine|chia|lin|sesame|pavot|chanvre|tournesol|courge|psyllium)\\b|\\bgraine\\b'), 10, '1 c. à soupe'],
  [R('^(amande|noix|noisette|cajou|pistache|macadamia|cacahuete|pecan|pignon|noix du bresil|fruits a coques|melange aperitif)\\b'), 30, '1 poignée'],
  // Herbs, spices, seaweed
  [R('^(ail)\\b'), 5, '1 gousse'],
  [R('^(persil|basilic|ciboulette|coriandre|menthe|aneth|estragon|thym|romarin|sauge|cerfeuil|origan|laurier|herbes)\\b(?!.*\\b(seche|sechee|seches|deshydrate|deshydratee|poudre)\\b)'), 5, '1 c. à soupe'],
  [R('^(nori)\\b'), 3, '1 feuille'],
  // Vegetables (count before the generic portion)
  [R('^tomate\\b(?!.*(puree|concentre|sechee))'), 120, '1 tomate'],
  [R('^carotte\\b'), 80, '1 carotte'],
  [R('^oignon\\b|^echalote\\b'), 50, '1/2 oignon'],
  [R('^(poivron)\\b'), 150, '1 poivron'],
  [R('^courgette\\b'), 200, '1 courgette'],
  [R('^(pomme de terre|patate douce)\\b'), 150, '1 pomme de terre'],
  [R('^(laitue|salade|mache|roquette|cresson|mesclun|scarole|frisee|endive|batavia|feuille de chene|pousses)\\b'), 50, '1 bol'],
  // Cereals & starches (raw vs cooked)
  [R('^(riz|quinoa|boulgour|semoule|millet|sarrasin|epeautre|ble|orge|avoine|polenta|couscous)\\b.*\\b(cru|crue|crus|crues|sec|secs|seche|seches)\\b'), 70, '1 portion crue'],
  [R('^(riz|quinoa|boulgour|semoule|millet|sarrasin|epeautre|ble|orge|polenta|couscous)\\b'), 180, '1 portion cuite'],
  [R('^pates\\b.*\\b(cru|crue|crues|seches)\\b(?!.*cuite)'), 80, '1 portion crue'],
  [R('^pates\\b'), 200, '1 portion cuite'],
  [R('^(flocons|muesli|porridge)\\b'), 40, '1 portion'],
  [R('^pain\\b|^baguette\\b|^biscotte\\b'), 40, '1 tranche'],
  [R('^(farine|fecule|amidon|son)\\b'), 30, '2 c. à soupe'],
  // Legumes (dry vs cooked)
  [R('^(lentille|haricot|pois|feve|flageolet|lupin|soja|legume sec)s?\\b.*\\b(sec|secs|seche|seches|crue|crues|cru|crus)\\b'), 60, '1 portion crue'],
  [R('^(lentille|haricot|pois chiche|feve|flageolet|lupin|legume sec)s?\\b'), 150, '1 portion cuite'],
  // Meat
  [R('^(jambon|bacon|lard)\\b'), 45, '1 tranche'],
  [R('\\bsteak hache|viande hachee'), 100, '1 steak haché'],
  [R('^(boeuf|veau)\\b.*\\b(steak|bifteck|entrecote|rumsteck|faux filet|bavette|onglet|filet)'), 125, '1 steak'],
  [R('\\b(escalope|filet|blanc)\\b.*\\b(poulet|dinde)|^(poulet|dinde)\\b.*\\b(escalope|filet|blanc|poitrine)'), 120, '1 filet'],
  [R('^(poulet|dinde|canard)\\b.*\\b(cuisse|pilon|haut de cuisse)'), 150, '1 cuisse'],
  [R('^(porc)\\b.*\\b(cote|cotelette)|^cote de porc'), 150, '1 côte'],
  [R('^(foie|coeur|rognon|langue|ris|cervelle|gesier)\\b'), 120, '1 portion'],
  [R('^(boeuf|veau|porc|agneau|mouton|poulet|dinde|canard|lapin|cheval|cerf|chevreuil|sanglier|chevreau|pintade|caille|oie|volaille|viande|gibier|autruche|bison|faisan|pigeon)\\b'), 120, '1 portion'],
  // Fish & seafood
  [R('^(huitre)\\b'), 60, '6 huîtres'],
  [R('^(moule|palourde|coque|bigorneau|praire|clam)\\b'), 100, '1 portion (chair)'],
  [R('^(crevette|gambas|langoustine|crabe|homard|langouste|calmar|calamar|encornet|poulpe|seiche|coquille saint jacques|saint jacques|noix de saint jacques)\\b'), 100, '1 portion'],
  [R('^(sardine|anchois|sprat|eperlan)\\b'), 100, '1 portion'],
  [R('^(saumon|thon|cabillaud|colin|lieu|merlu|sole|dorade|daurade|bar|loup|turbot|raie|rouget|truite|maquereau|hareng|espadon|flétan|fletan|merlan|limande|perche|brochet|carpe|pangas|tilapia|roussette|lotte|julienne|mulet|eglefin|haddock|anguille|lompe|empereur|grenadier|sebaste|vivaneau|mérou|merou|poisson)\\b'), 130, '1 filet'],
  // Generic fallbacks by category
];

const CATEGORY_DEFAULTS: Record<string, [number, string]> = {
  VEGETABLES: [150, '1 portion'],
  MEAT: [120, '1 portion'],
  FISH_SEAFOOD: [130, '1 portion'],
  FRUITS: [125, '1 portion'],
  LEGUMES: [150, '1 portion'],
  SEAWEED: [10, '1 c. à soupe'],
  NUTS_SEEDS: [30, '1 poignée'],
};

const PROCESSED_RULES: Rule[] = [
  [R('^(jus|nectar|soda|boisson|limonade|sirop dilue|the|cafe|infusion|eau|biere|cidre|smoothie)\\b'), 250, '1 verre (250 ml)'],
  [R('^vin\\b'), 125, '1 verre (12,5 cl)'],
  [R('^(pizza|quiche|tarte salee)\\b'), 150, '1 part'],
  [R('^sandwich\\b|^croque|^burger|^hamburger|^kebab|^panini|^wrap'), 200, '1 sandwich'],
  [R('^(soupe|veloute|potage|bouillon|gaspacho)\\b'), 250, '1 bol'],
  [R('^(sauce|ketchup|mayonnaise|moutarde|vinaigrette|pesto)\\b'), 15, '1 c. à soupe'],
  [R('^(chocolat)\\b'), 20, '2 carrés'],
  [R('^(biscuit|cookie|sable|galette|petit beurre|gaufrette|madeleine|financier|macaron|speculoos)\\b'), 25, '2 biscuits'],
  [R('^(cereales|muesli)\\b'), 40, '1 bol'],
  [R('^(croissant|pain au chocolat|brioche|viennoiserie|chausson|pain aux raisins)\\b'), 60, '1 viennoiserie'],
  [R('^(gateau|cake|tarte|eclair|mille feuille|patisserie|beignet|crepe|gaufre|muffin|brownie|clafoutis|flan)\\b'), 100, '1 part'],
  [R('^(glace|sorbet|creme glacee|cone)\\b'), 60, '1 boule'],
  [R('^(compote|puree de fruits|dessert de fruits|specialite de fruits)\\b'), 100, '1 pot'],
  [R('^(creme dessert|mousse|liegeois|riz au lait|semoule au lait|dessert lacte|panna cotta)\\b'), 100, '1 pot'],
  [R('^(chips|biscuit aperitif|crackers|soufflé|souffle)\\b'), 30, '1 poignée'],
  [R('^(barre)\\b'), 25, '1 barre'],
  [R('^(bonbon|confiserie|pate de fruit|nougat|caramel)\\b'), 10, '1 bonbon'],
  [R('^(saucisson|chorizo|salami|rosette|pate|rillettes|terrine|mousse de foie|boudin)\\b'), 30, '1 portion'],
  [R('^(saucisse|merguez|chipolata|knack|cervelas)\\b'), 50, '1 saucisse'],
  [R('^(nuggets|cordon bleu|pane|poisson pane|steak vegetal|galette vegetale)\\b'), 100, '1 portion'],
];

function norm(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Usual portion of a food, or undefined when 100 g is the most sensible default. */
export function usualPortion(food: Pick<Food, 'name' | 'category'>): { grams: number; label: string } | undefined {
  const n = norm(food.name);
  // Seaweed: dried ones are used by the spoonful, fresh ones by the small bowl.
  if (food.category === 'SEAWEED') return /^nori\b/.test(n) ? { grams: 3, label: '1 feuille' } : /\b(seche|sechee|seches|sechees|deshydrate|deshydratee|poudre|flocons)\b/.test(n) ? { grams: 5, label: '1 c. à soupe' } : { grams: 30, label: '1 portion' };
  // Dried vegetables (sun-dried tomato, dried mushrooms…): a small handful.
  if (food.category === 'VEGETABLES' && /\b(seche|sechee|seches|sechees|deshydrate|deshydratee|lyophilise)\b/.test(n)) return { grams: 20, label: '1 petite poignée' };
  // Dried fruit (other than the ones counted by the piece): a handful.
  if (food.category === 'FRUITS' && /\b(sec|seche|sechee|seches|deshydrate|deshydratee|lyophilise)\b/.test(n) && !/^(datte|figue|abricot|pruneau|prune|raisin)/.test(n)) return { grams: 30, label: '1 poignée' };
  const rules = food.category === 'PROCESSED' ? [...PROCESSED_RULES, ...RULES] : RULES;
  for (const [pattern, grams, label] of rules) if (pattern.test(n)) return { grams, label };
  if (food.category === 'PROCESSED') return { grams: 150, label: '1 portion' };
  if (food.category === 'HERBS_SPICES') return /\b(frais|fraiche|fraiches|cru|crue)\b/.test(n) ? { grams: 5, label: '1 c. à soupe' } : { grams: 2, label: '1 c. à café' };
  const fallback = CATEGORY_DEFAULTS[food.category];
  return fallback ? { grams: fallback[0], label: fallback[1] } : undefined;
}

/** Gives a food its usual portion when it only has the generic « 100 g ». */
export function withUsualPortion(food: Food): Food {
  if (food.portionGrams !== 100 || food.portionLabel !== '100 g') return food;
  const portion = usualPortion(food);
  return portion ? { ...food, portionGrams: portion.grams, portionLabel: portion.label } : food;
}
