// Adaptive particles: fewer when frames are slow, back to full when smooth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptVisible, MIN_VISIBLE, PARTICLE_COUNT } from '../src/neon/adaptive';

const run = (state: number[], ms: number, seconds: number) => { let v = state[1]; for (let t = 0; t < seconds; t += ms / 1000) v = adaptVisible(state, ms / 1000); return v; };

test('60 fps keeps every particle', () => { assert.equal(run([16, PARTICLE_COUNT, 0], 16.7, 20), PARTICLE_COUNT); });
test('30 fps sheds particles down to the floor', () => { assert.equal(run([16, PARTICLE_COUNT, 0], 33, 30), MIN_VISIBLE); });
test('smooth again brings them back', () => { const s = [33, MIN_VISIBLE, 0]; assert.equal(run(s, 16.7, 120), PARTICLE_COUNT); });
