"""Imports the full Ciqual 2025 table (ANSES) into PRIMAL.

Source: Table Ciqual 2025 (ANSES), Licence Ouverte / Open Licence Etalab 2.0.
        https://ciqual.anses.fr  — file kept in tools/data/ for reproducibility.

Rules (agreed with the product owner):
  * every food is searchable, with no duplicate of the existing base
    (src/lib/foodCore.ts and src/lib/ciqual2025.ts, matched by Ciqual code,
    and by name for the PRIMAL foods that have no code);
  * only raw or minimally processed foods get a browsable category; the others
    get the hidden category PROCESSED (searchable, never shown as a chip);
  * a food is kept only when it is well documented: energy, protein,
    carbohydrates, fat and fibre are known AND at least half of the
    micronutrients tracked by the app are known.
    Ciqual value conventions: "-" = not measured (unknown); "traces" = 0;
    "< x" = measured below the detection limit → x / 2 (middle-bound, usual practice);
    missing energy is computed from the macros with the EU factors (as ANSES does);
  * a food whose declared energy is far from the one computed from its macros is
    reported for review (Ciqual's declared value is kept: it is the official one).

    python3 tools/import-ciqual.py      # writes src/lib/ciqualFull.ts and prints a report
"""
import json
import re
import sys
import unicodedata
from collections import Counter

import openpyxl

SRC = 'tools/data/Table_Ciqual_2025_FR_2025_11_03.xlsx'
OUT = 'src/lib/ciqualFull.ts'
MIN_MICROS = 12  # out of 23 micronutrients present in Ciqual

# Column index in the Ciqual sheet → PRIMAL nutrient key.
COLS = {
    'kcal': 10, 'water': 13, 'protein': 14, 'carbs': 16, 'fat': 17, 'sugar': 18, 'fiber': 26, 'satFat': 31,
    'calcium': 50, 'copper': 52, 'iron': 53, 'iodine': 54, 'magnesium': 55, 'manganese': 56, 'phosphorus': 57,
    'potassium': 58, 'selenium': 59, 'sodium': 60, 'zinc': 61, 'vitA': 62, 'vitD': 65, 'vitE': 69, 'vitK': 70,
    'vitC': 72, 'vitB1': 73, 'vitB2': 74, 'vitB3': 75, 'vitB5': 76, 'vitB6': 77, 'vitB9': 78, 'vitB12': 82,
}
FALLBACK = {'vitE': 68, 'vitB9': 79}  # alpha-tocopherol, total folates
OMEGA3 = (44, 46, 47)                  # ALA + EPA + DHA
ALCOHOL, ORGANIC_ACIDS, POLYOLS = 29, 30, 27
MACROS = ['kcal', 'protein', 'carbs', 'fat', 'fiber']
MICROS = ['calcium', 'copper', 'iron', 'iodine', 'magnesium', 'manganese', 'phosphorus', 'potassium', 'selenium', 'sodium',
          'zinc', 'vitA', 'vitD', 'vitE', 'vitK', 'vitC', 'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB9', 'vitB12']
KEYS = ['kcal', 'water', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'satFat', 'omega3'] + MICROS

# Raw / minimally processed: Ciqual sub-group → PRIMAL category.
RAW_SUBGROUPS = {
    '0201': 'VEGETABLES', '0202': 'VEGETABLES', '0203': 'LEGUMES', '0204': 'FRUITS', '0205': 'NUTS_SEEDS',
    '0301': 'CEREALS', '0302': 'CEREALS', '0304': 'CEREALS',
    '0401': 'MEAT', '0402': 'MEAT', '0405': 'FISH_SEAFOOD', '0406': 'FISH_SEAFOOD', '0407': 'FISH_SEAFOOD', '0408': 'FISH_SEAFOOD', '0410': 'EGGS',
    '0501': 'DAIRY', '0502': 'DAIRY', '0503': 'DAIRY', '0504': 'DAIRY',
    '0901': 'FATS', '0902': 'FATS', '0904': 'FATS',
    '1005': 'HERBS_SPICES', '1006': 'HERBS_SPICES', '1007': 'SEAWEED',
}
# Sub-sub-groups that are processed even inside a raw sub-group.
PROCESSED_SUBSUB = {'compotes et assimilés', 'fruits appertisés', 'biscottes et pains grillés', 'omelettes et autres ovoproduits',
                    'desserts lactés', 'autres desserts', 'desserts végétaux', 'alternatives végétales aux fromages', 'fromage fondus'}
# Words that reveal a transformation (whole words on the normalised name; feminine/plural forms included).
PROCESSED_WORDS = [
    'sucre', 'aromatise', 'aux fruits', 'chocolat', 'vanille', 'sirop', 'confit', 'pane', 'frit', 'frite', 'beignet', 'preemballe',
    'sauce', 'cuisine', 'gratin', 'gratine', 'farci', 'chips', 'souffle', 'fume', 'marine', 'sale', 'au fromage', 'a la creme',
    'de mie', 'brioche', 'viennois', 'aux raisins', 'burger', 'hot dog', 'pudding', 'nugget', 'cordon bleu',
    'pommes noisettes', 'dauphine', 'rissole', 'chantilly', 'pate a tartiner', 'beurre de', 'pate de', 'creme de', 'enrobe',
    'caramel', 'caramelise', 'miel', 'nectar', 'jus', 'boisson', 'dessert', 'mousse', 'flan', 'tartinable', 'fondu', 'surimi',
    'pizza', 'quiche', 'tarte', 'croissant', 'gateau', 'biscuit', 'garni', 'assaisonne', 'a l huile', 'au lait', 'en sauce',
]
WORD_RE = [(w, re.compile(r'\b' + w + r'(e|s|es)?\b')) for w in PROCESSED_WORDS]
# Phrases that cancel one of those words (e.g. a cheese « au lait cru » is not « au lait » chocolate).
CANCEL = {
    'sucre': re.compile(r'\b(non|sans) sucres?( ajoutes?)?\b'),
    'sale': re.compile(r'\b(non sale|sans sel)\b'),
    'au lait': re.compile(r'\bau lait (cru|thermise|pasteurise|de|entier|cru ou thermise|microfiltre)\b'),
    'miel': re.compile(r'\bmelon miel\b'),
    'vanille': re.compile(r'\bvanille gousse\b'),
    'marine': re.compile(r'\bcriste marine\b'),
    'enrobe': re.compile(r'\benrobe de cire\b'),
    'beurre de': re.compile(r'\bhuile ou beurre de\b'),
    'gratin': re.compile(r'\bfromages rapes\b'),
}
# PRIMAL foods with no Ciqual code → Ciqual food they already represent (skip it, no duplicate).
SAME_AS_PRIMAL = {
    'Datte': 'Datte, chair et peau, sans noyau, sèche', 'Riz blanc, cru': 'Riz blanc, cru',
    'Lentilles, sèches': 'Lentille, sèche (aliment moyen)', 'Pain complet': 'Pain complet ou intégral (à la farine T150)',
    'Espadon, cru': 'Espadon, cru', 'Papaye': 'Papaye, chair sans peau, crue', 'Groseille': 'Groseille, crue',
    'Litchi': 'Litchi, chair sans peau, sans noyau, cru', 'Nectarine': 'Nectarine ou brugnon, chair et peau, sans noyau, crue (aliment moyen)',
    'Fruit de la passion': 'Fruit de la passion ou maracudja, chair sans peau, avec pépins, cru',
    'Pamplemousse / pomelo': 'Pomelo (dit Pamplemousse), chair sans peau, sans pépins, cru',
    'Clémentine': 'Clémentine ou mandarine, chair sans peau, sans pépins, crue', 'Citron': 'Citron, chair sans peau, sans pépins, cru',
    'Pastèque': 'Pastèque, chair sans peau, sans pépins, crue', 'Goyave': 'Goyave, chair sans peau, crue', 'Miel': 'Miel',
    'Colin': 'Lieu jaune ou colin, cru', 'Huile de coco': 'Huile ou graisse de coco (coprah), raffinée', 'Eau de coco': 'Eau de coco',
    'Pâtes alimentaires, crues': 'Pâtes sèches, standard, crues',
}


def norm(text):
    text = unicodedata.normalize('NFD', (text or '').lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def clean(text):
    return re.sub(r'\s+', ' ', (text or '').replace('\n', ' ')).strip()


def num(value):
    if value is None:
        return None
    s = str(value).strip().replace(',', '.')
    if s.lower() == 'traces':
        return 0.0
    if s.startswith('<'):
        try:
            return float(s[1:].strip()) / 2  # below detection limit → middle-bound
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None  # '-' → not measured


def existing_codes():
    codes = set()
    for path in ('src/lib/foodCore.ts', 'src/lib/ciqual2025.ts'):
        codes |= {int(c) for c in re.findall(r'alim_code: (\d+)', open(path, encoding='utf-8').read())}
    return codes


def is_processed(subgroup, subsub, name):
    if subgroup not in RAW_SUBGROUPS or subsub in PROCESSED_SUBSUB:
        return True
    n = norm(name)
    if subgroup == '0502' and not re.search(r'\bnature\b', n) and not (re.search(r'\bfaisselle\b', n) and 'coulis' not in n):
        return True  # yogurts / fromage blanc: only plain ones are raw
    for word, pattern in WORD_RE:
        if pattern.search(n) and not (word in CANCEL and CANCEL[word].search(n)):
            return True
    return False


def write_extras(rows):
    """Foods missing from Ciqual (tools/primal-extras.json) → src/lib/foodExtras.ts."""
    spec = json.load(open('tools/primal-extras.json', encoding='utf-8'))
    by_code = {int(r[6]): r for r in rows if r[6]}
    foods = []
    for item in spec['foods']:
        values = dict(item.get('values', {}))
        if 'basedOnCiqual' in item:
            r = by_code[item['basedOnCiqual']]
            values = {k: num(r[i]) for k, i in COLS.items()}
            for k, i in FALLBACK.items():
                if values[k] is None:
                    values[k] = num(r[i])
            values = {k: round(v, 4) for k, v in values.items() if v is not None}
        missing_macros = [k for k in MACROS if k not in values]
        n_micros = sum(k in values for k in MICROS)
        if missing_macros or n_micros < MIN_MICROS:
            print(f'  extra "{item["name"]}" skipped: not enough data ({missing_macros}, {n_micros} micros)')
            continue
        foods.append({'id': item['id'], 'name': item['name'], 'category': item['category'], 'source': item['source'], 'aliases': item.get('aliases', []), 'per100': values})
    aliases = {k: v for k, v in spec.get('aliases', {}).items() if not k.startswith('_')}
    with open('src/lib/foodExtras.ts', 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/import-ciqual.py from tools/primal-extras.json — do not edit by hand.\n')
        f.write('// Foods missing from Ciqual 2025, added as clearly labelled estimates.\n')
        f.write("import type { Food } from '../types';\n\n")
        f.write('export const FOOD_EXTRAS: Food[] = ' + json.dumps([{
            'id': x['id'], 'source': 'core', 'ciqualRaw': {'source': x['source'], 'sourceName': x['name'], 'category': x['category'], 'reference': '100 g'},
            'name': x['name'], 'category': x['category'], 'portionLabel': '100 g', 'portionGrams': 100, 'per100': x['per100'],
        } for x in foods], ensure_ascii=False, indent=2) + ';\n\n')
        f.write('/** Extra search names (food id → aliases), including existing PRIMAL foods known under another name. */\n')
        f.write('export const EXTRA_ALIASES: Record<string, string[]> = ' + json.dumps({**{x['id']: x['aliases'] for x in foods}, **aliases}, ensure_ascii=False, indent=2) + ';\n')
    print(f'extras: {len(foods)} foods, {len(aliases)} aliases → src/lib/foodExtras.ts')


def main():
    sheet = openpyxl.load_workbook(SRC, read_only=True)['composition nutritionnelle']
    rows = list(sheet.iter_rows(values_only=True))[1:]
    known = existing_codes()
    by_name = {clean(r[7]): int(r[6]) for r in rows if r[6]}
    skip_same = {}
    for primal, ciqual in SAME_AS_PRIMAL.items():
        if ciqual in by_name:
            skip_same[by_name[ciqual]] = primal
        else:
            print(f'  ! no Ciqual match for PRIMAL "{primal}" ({ciqual})', file=sys.stderr)

    existing_names = {norm(a or b) for path in ('src/lib/foodCore.ts', 'src/lib/ciqual2025.ts')
                      for a, b in re.findall(r"(?:name|nom): (?:'((?:[^'\\]|\\.)*)'|\"([^\"]*)\")", open(path, encoding='utf-8').read())}
    seen_names = set()
    report = Counter(); out = []; anomalies = []
    for r in rows:
        code = int(r[6]); name = clean(r[7]); subgroup = str(r[1]); subsub = clean(r[5])
        if code == 24999 or subgroup.startswith('00'):
            report['skipped: average placeholder'] += 1; continue
        if code in known:
            report['skipped: already in PRIMAL (code)'] += 1; continue
        if code in skip_same:
            report['skipped: already in PRIMAL (name)'] += 1; continue
        if norm(name) in existing_names or norm(name) in seen_names:
            report['skipped: same name already in base'] += 1; continue
        seen_names.add(norm(name))
        values = {k: num(r[i]) for k, i in COLS.items()}
        for k, i in FALLBACK.items():
            if values[k] is None:
                values[k] = num(r[i])
        o3 = [num(r[i]) for i in OMEGA3]
        values['omega3'] = round(sum(o3), 4) if all(v is not None for v in o3) else None
        energy_parts = (values['protein'], values['carbs'], values['fat'], values['fiber'])
        if values['kcal'] is None and all(v is not None for v in energy_parts):
            values['kcal'] = round(4 * values['protein'] + 4 * values['carbs'] + 9 * values['fat'] + 2 * values['fiber']
                                   + 7 * (num(r[ALCOHOL]) or 0) + 3 * (num(r[ORGANIC_ACIDS]) or 0) + 2.4 * (num(r[POLYOLS]) or 0))
            report['note: energy computed from macros'] += 1
        if any(values[k] is None for k in MACROS):
            report['excluded: incomplete macros'] += 1; continue
        if sum(values[k] is not None for k in MICROS) < MIN_MICROS:
            report['excluded: too few micronutrients'] += 1; continue
        # Energy coherence (EU factors): protein 4, carbs 4, fat 9, fibre 2, alcohol 7, organic acids 3, polyols 2.4.
        computed = 4 * values['protein'] + 4 * values['carbs'] + 9 * values['fat'] + 2 * values['fiber'] \
            + 7 * (num(r[ALCOHOL]) or 0) + 3 * (num(r[ORGANIC_ACIDS]) or 0) + 2.4 * (num(r[POLYOLS]) or 0)
        if values['kcal'] > 20 and abs(computed - values['kcal']) / values['kcal'] > 0.35:
            anomalies.append(f'{code} {name}: {values["kcal"]} kcal declared vs {computed:.0f} computed')
        processed = is_processed(subgroup, subsub, name)
        category = 'PROCESSED' if processed else RAW_SUBGROUPS[subgroup]
        report['kept: processed (search only)' if processed else 'kept: raw (Base PRIMAL)'] += 1
        report[f'  category {category}'] += 1
        out.append([code, name, category, 0 if processed else 1] + [values[k] if values[k] is None else round(values[k], 4) for k in KEYS])

    out.sort(key=lambda row: (row[3] == 0, row[2], norm(row[1])))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/import-ciqual.py — do not edit by hand.\n')
        f.write('// Source: Table Ciqual 2025 (ANSES), Licence Ouverte Etalab 2.0 — https://ciqual.anses.fr\n')
        f.write('// Row: [alim_code, name, category, raw (1) or processed (0), ...values in CIQUAL_FULL_KEYS order, per 100 g; null = unknown]\n')
        f.write('import type { NutrientKey } from \'../types\';\n\n')
        f.write(f'export const CIQUAL_FULL_KEYS: NutrientKey[] = {json.dumps(KEYS)};\n\n')
        f.write('export type CiqualFullRow = [number, string, string, number, ...Array<number | null>];\n\n')
        f.write('export const CIQUAL_FULL_ROWS: CiqualFullRow[] = [\n')
        for row in out:
            f.write('  ' + json.dumps(row, ensure_ascii=False).replace('NaN', 'null') + ',\n')
        f.write('];\n')

    write_extras(rows)
    print(f'Ciqual rows: {len(rows)}')
    for k, v in sorted(report.items()):
        print(f'{k}: {v}')
    print(f'written: {len(out)} foods → {OUT}')
    if anomalies:
        print(f'energy anomalies ({len(anomalies)}):'); print('\n'.join('  ' + a for a in anomalies[:40]))


if __name__ == '__main__':
    main()
