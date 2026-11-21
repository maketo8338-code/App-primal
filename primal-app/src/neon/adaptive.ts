// Kept apart from NeonProvider so it can be unit-tested without native modules.
export const PARTICLE_COUNT = 130;
/** Fewest particles drawn when the phone struggles. */
export const MIN_VISIBLE = 45;

/**
 * Adaptive quality: [smoothed frame ms, visible count, seconds since last change].
 * When frames get slow (< ~45 fps) for a moment, fewer particles are drawn;
 * when it is smooth again, they come back slowly. Simulation is unchanged.
 */
export function adaptVisible(state: number[], dtSeconds: number): number {
  'worklet';
  const ms = dtSeconds * 1000;
  state[0] = state[0] * 0.94 + ms * 0.06;
  state[2] += dtSeconds;
  if (state[2] > 1.2) {
    if (state[0] > 22 && state[1] > MIN_VISIBLE) { state[1] = Math.max(MIN_VISIBLE, Math.round(state[1] * 0.8)); state[2] = 0; }
    else if (state[0] < 17.5 && state[1] < PARTICLE_COUNT && state[2] > 4) { state[1] = Math.min(PARTICLE_COUNT, state[1] + 10); state[2] = 0; }
  }
  return state[1];
}
