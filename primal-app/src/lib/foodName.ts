/**
 * Splits a Ciqual name into a short name and its detail, for display only:
 * « Pomme, chair et peau, crue » → { title: 'Pomme', detail: 'chair et peau, crue' }.
 * The full name is kept everywhere else (journal, search, backups).
 */
export function splitFoodName(name: string): { title: string; detail?: string } {
  const index = name.indexOf(', ');
  if (index <= 0) return { title: name };
  const title = name.slice(0, index).trim();
  const detail = name.slice(index + 2).trim();
  return detail ? { title, detail } : { title };
}
