// Galaxy codes: forgiving input, one distinct hash per variant, locked variants cannot be forced.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GALAXY_CODE_HASHES, hashCode, normalizeCode, unlockedByCode, variantForCode } from '../src/galaxy/codes';
import { GALAXY_IDS } from '../src/lib/theme';
import { sanitizeAmbience } from '../src/lib/theme';

test('input is normalised: case, accents, spaces and punctuation do not matter', () => {
  assert.equal(normalizeCode(" L'Étoile, qui  meurt! "), 'LETOILEQUIMEURT');
  assert.equal(hashCode("L'Étoile qui meurt"), hashCode('l etoile QUI meurt'));
});
test('every variant has its own non-empty hash, and wrong codes unlock nothing', () => {
  const hashes = Object.values(GALAXY_CODE_HASHES);
  assert.ok(hashes.every((h) => h.length > 0));
  assert.equal(new Set(hashes).size, hashes.length);
  assert.equal(variantForCode('nope'), null);
  assert.equal(variantForCode('   '), null);
});
test('a locked galaxy cannot be the active accent', () => {
  assert.equal(sanitizeAmbience({ accent: 'aurore', unlocked: [] }).accent, 'braise');
  assert.equal(sanitizeAmbience({ accent: 'aurore', unlocked: ['aurore', 'fake'] }).accent, 'aurore');
  assert.deepEqual(sanitizeAmbience({ unlocked: ['aurore', 'fake'] }).unlocked, ['aurore']);
});
test('the start gift code unlocks the four Galaxie (not Métal); individual codes unlock one; junk unlocks nothing', () => {
  assert.deepEqual(unlockedByCode(' Start-Gift '), GALAXY_IDS);
  assert.equal(unlockedByCode('startgift').length, 4);
  assert.equal(unlockedByCode('primalgold').length, 1);
  assert.deepEqual(unlockedByCode('nope'), []);
});
