// Codes that unlock the « Galaxie » variants (one code per variant).
// Only a hash of each code is stored, so the codes are not written in clear in the app.
// To change a code: `node tools/galaxy-code.mjs MONCODE` and paste the printed hash below.
// This is light protection for a free cosmetic: a determined person could still find them.
import type { GalaxyId } from '../lib/theme';

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

// ⚠️ PROVISIONAL codes — replace before publishing.
export const GALAXY_CODE_HASHES: Record<GalaxyId, string> = {
  nebuleuse: '114pjf9r4bx', // provisional: NEBULA
  aurore: '1vn2mz4s8yn',    // provisional: AURORA
  supernova: '1mo3k5yabxr', // provisional: SUPERNOVA
  trounoir: '1fi4p0uxnaw',  // provisional: HORIZON
};

/** Returns the variant a code unlocks, or null. */
export function variantForCode(input: string): GalaxyId | null {
  if (!normalizeCode(input)) return null;
  const hash = hashCode(input);
  const match = (Object.keys(GALAXY_CODE_HASHES) as GalaxyId[]).find((id) => GALAXY_CODE_HASHES[id] === hash);
  return match ?? null;
}
