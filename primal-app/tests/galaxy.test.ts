// Galaxy codes: one code per variant, forgiving input, locked variants cannot be forced.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { variantForCode } from '../src/galaxy/codes';
import { sanitizeAmbience } from '../src/lib/theme';

test('codes unlock their own variant', () => {
  assert.equal(variantForCode('nebula'), 'nebuleuse');
  assert.equal(variantForCode(' Super-Nova '), 'supernova');
  assert.equal(variantForCode('horizon'), 'trounoir');
  assert.equal(variantForCode('nope'), null);
  assert.equal(variantForCode(''), null);
});
test('a locked galaxy cannot be the active accent', () => {
  assert.equal(sanitizeAmbience({ accent: 'aurore', unlocked: [] }).accent, 'braise');
  assert.equal(sanitizeAmbience({ accent: 'aurore', unlocked: ['aurore', 'fake'] }).accent, 'aurore');
  assert.deepEqual(sanitizeAmbience({ unlocked: ['aurore', 'fake'] }).unlocked, ['aurore']);
});
