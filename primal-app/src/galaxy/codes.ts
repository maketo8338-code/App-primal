// Codes that unlock the « Galaxie » variants (one code per variant).
// Only a hash of each code is stored, so the codes are not written in clear in the app.
// To change a code: `node tools/galaxy-code.mjs MONCODE` and paste the printed hash below.
// This is light protection for a free cosmetic: a determined person could still find them.
import { GALAXY_IDS, type LockedId } from '../lib/theme';

/** Normalises what the user typed: case, spaces and accents do not matter. */
export function normalizeCode(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** cyrb53: small, fast 53-bit string hash (not cryptographic). */
export function hashCode(input: string): string {
  const str = `primal-galaxy:${normalizeCode(input)}`;
  let h1 = 0xdeadbeef; let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Each code is a short phrase (punctuation, accents and case are ignored). Only hashes are stored.
export const GALAXY_CODE_HASHES: Record<LockedId, string> = {
  nebuleuse: '1uw8d7loj70',
  aurore: '1802byd5xre',
  supernova: 'd51evrw5a4',
  trounoir: '1obz96mi4kf',
  or: '1d02jx3uhqv',
  chrome: 'fdwtym3kap',
};

/** « Cadeau de démarrage »: one code that unlocks the four Galaxie themes (kept for the whole v1). The Métal themes keep their own codes. */
const MASTER_CODE_HASH = 'me2kg856fn';

/** Every theme a code unlocks: the four Galaxie for the master code, one for an individual code, none otherwise. */
export function unlockedByCode(input: string): LockedId[] {
  if (!normalizeCode(input)) return [];
  if (hashCode(input) === MASTER_CODE_HASH) return [...GALAXY_IDS];
  const one = variantForCode(input);
  return one ? [one] : [];
}

/** Returns the variant an individual code unlocks, or null. */
export function variantForCode(input: string): LockedId | null {
  if (!normalizeCode(input)) return null;
  const hash = hashCode(input);
  const match = (Object.keys(GALAXY_CODE_HASHES) as LockedId[]).find((id) => GALAXY_CODE_HASHES[id] === hash);
  return match ?? null;
}
