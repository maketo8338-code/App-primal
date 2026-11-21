// ─────────────────────────────────────────────────────────────────────────────
// Galaxy sky — shared simulation for the four « Galaxie » variants.
// Pure worklet functions: run on the UI thread natively (GalaxyField.tsx) and
// in requestAnimationFrame on the web (GalaxyBackground.web.tsx).
//
// Everything lives in one flat number array: the state first (STATE_LEN
// numbers), then this frame's draw list (ops, OP numbers each). The renderers
// only read the ops, so both platforms draw exactly the same picture.
//
// Depth: every star has a depth (0.15 far → 1 near). Tilt, scroll and touch
// move near stars more than far ones, so the sky has real parallax.
// ─────────────────────────────────────────────────────────────────────────────

export const KIND = { nebuleuse: 0, aurore: 1, supernova: 2, trounoir: 3 } as const;

/** Draw ops: [type, x, y, rx, ry, alpha, color, angle]. */
export const OP = 8;
export const T_GLOW = 0;   // soft radial light, ellipse rx × ry, rotated by angle (rad)
export const T_STAR = 1;   // star: small coloured halo + white core, radius rx
export const T_STREAK = 2; // light streak from (x, y), length rx, width ry, direction angle
export const T_RING = 3;   // thin glowing ring, radius rx, width ry
export const T_HOLE = 4;   // black disk with a soft edge, radius rx (covers what is behind)
/** Colour indexes: 0 = palette a, 1 = b, 2 = c, 3 = white. */

const TAU = Math.PI * 2;
export const NS = 190;   // stars
const SS = 8;            // x, y, vx, vy, depth, size, phase, heat
const NB = 8;            // nebula blobs
const BS = 6;            // x, y, r, color, phase, depth
const ND = 120;          // black-hole disk particles
const DS = 4;            // angle, radius, speed, size
const NM = 3;            // shooting stars
const MS = 5;            // x, y, vx, vy, life
const H0 = 16;           // header
const STARS = H0; const BLOBS = STARS + NS * SS; const DISK = BLOBS + NB * BS; const METEORS = DISK + ND * DS;
export const STATE_LEN = METEORS + NM * MS;
// Header: 0 init W, 1 init H, 2 offX, 3 offY, 4 pvx, 5 pvy, 6 energy, 7 meteor timer, 8 ring x, 9 ring y, 10 ring age, 11 kind

function op(s: number[], type: number, x: number, y: number, rx: number, ry: number, alpha: number, color: number, angle: number) {
  'worklet';
  if (alpha <= 0.004) return;
  s.push(type, x, y, rx, ry, alpha > 1 ? 1 : alpha, color, angle);
}

function holeCenter(W: number, H: number): number[] { 'worklet'; return [W * 0.72, H * 0.13, Math.min(W, H) * 0.1]; }
function novaCenter(W: number, H: number): number[] { 'worklet'; return [W * 0.86, -H * 0.06]; }

function spawnStar(s: number[], i: number, W: number, H: number, kind: number, anywhere: boolean) {
  'worklet';
  const o = STARS + i * SS;
  const layer = Math.random();
  const depth = layer < 0.55 ? 0.12 + Math.random() * 0.2 : layer < 0.87 ? 0.4 + Math.random() * 0.25 : 0.8 + Math.random() * 0.2;
  let x = Math.random() * W; let y = Math.random() * H; let vx = 0; let vy = 0;
  if (!anywhere && kind === KIND.supernova && Math.random() < 0.6) {
    // New embers are born near the core and fly outwards.
    const c = novaCenter(W, H); const a = Math.PI * (0.5 + Math.random() * 0.6);
    x = c[0] + Math.cos(a) * 40; y = c[1] + Math.sin(a) * 40;
    const sp = 25 + depth * 70; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
  } else if (!anywhere && kind === KIND.trounoir) {
    // Stars come in from the edges and spiral towards the hole.
    const edge = Math.floor(Math.random() * 4);
    x = edge === 0 ? -10 : edge === 1 ? W + 10 : Math.random() * W; y = edge === 2 ? -10 : edge === 3 ? H + 10 : Math.random() * H;
  }
  s[o] = x; s[o + 1] = y; s[o + 2] = vx; s[o + 3] = vy; s[o + 4] = depth;
  s[o + 5] = (0.5 + depth * 1.9) * (0.7 + Math.random() * 0.6); s[o + 6] = Math.random() * TAU; s[o + 7] = 0;
}

function init(s: number[], W: number, H: number, kind: number) {
  'worklet';
  s.length = 0;
  for (let i = 0; i < STATE_LEN; i++) s.push(0);
  s[0] = W; s[1] = H; s[7] = 2 + Math.random() * 3; s[10] = 9; s[11] = kind;
  for (let i = 0; i < NS; i++) spawnStar(s, i, W, H, kind, true);
  const big = Math.max(W, H);
  for (let i = 0; i < NB; i++) {
    const o = BLOBS + i * BS;
    s[o] = Math.random() * W; s[o + 1] = Math.random() * H * 1.1 - H * 0.05; s[o + 2] = big * (0.28 + Math.random() * 0.32);
    s[o + 3] = i % 3; s[o + 4] = Math.random() * TAU; s[o + 5] = 0.06 + Math.random() * 0.22;
  }
  const r0 = Math.min(W, H) * 0.11;
  for (let i = 0; i < ND; i++) {
    const o = DISK + i * DS; const rr = r0 * (1.25 + Math.pow(Math.random(), 0.8) * 1.6);
    s[o] = Math.random() * TAU; s[o + 1] = rr; s[o + 2] = 1.6 * Math.pow(r0 / rr, 1.5); s[o + 3] = 0.6 + Math.random() * 1.6;
  }
}

/**
 * Advances the sky by dt seconds and rebuilds the draw list.
 * impulses: flat [x, y, strength, kind, …] (kind 0 = tap, 1 = shake).
 * tilt: high-pass accelerometer [x, y]. flow: scroll/drag speed [vx, vy] px/s.
 * visible: how many stars to draw (adaptive quality).
 */
export function stepSky(s: number[], dt: number, t: number, W: number, H: number, kind: number, impulses: number[], tilt: number[], flow: number[], k: number, visible: number) {
  'worklet';
  if (s.length < STATE_LEN || s[0] !== W || s[1] !== H || s[11] !== kind) init(s, W, H, kind);
  s.length = STATE_LEN; // drop last frame's ops
  const fx = flow[0] || 0; const fy = flow[1] || 0; const gx = tilt[0] || 0; const gy = tilt[1] || 0;
  const speed = Math.sqrt(fx * fx + fy * fy);

  // ── Camera: tilt moves the whole sky, near layers more (parallax) ──
  s[4] = (s[4] + gx * 900 * dt) * Math.exp(-2.2 * dt); s[5] = (s[5] + gy * 900 * dt) * Math.exp(-2.2 * dt);
  s[2] = (s[2] + s[4] * dt) * Math.exp(-0.5 * dt); s[3] = (s[3] + s[5] * dt) * Math.exp(-0.5 * dt);
  s[2] = Math.max(-140, Math.min(140, s[2])); s[3] = Math.max(-140, Math.min(140, s[3]));
  const camX = s[2]; const camY = s[3];
  s[6] = Math.min(2.5, s[6] * Math.exp(-1.4 * dt) + Math.min(1, speed / 2500) * dt * 6);

  // ── Touch ──
  for (let q = 0; q + 3 < impulses.length; q += 4) {
    const ix = impulses[q]; const iy = impulses[q + 1]; const st = (impulses[q + 2] || 1) * k; const shake = impulses[q + 3] === 1;
    if (!Number.isFinite(ix) || !Number.isFinite(iy)) { if (!shake) continue; }
    if (shake) { s[6] = Math.min(2.5, s[6] + 0.8 * st); continue; }
    s[6] = Math.min(2.5, s[6] + 0.5 * st);
    if (kind === KIND.supernova) { s[8] = ix; s[9] = iy; s[10] = 0; }
    const R = Math.max(130, Math.min(W, H) * 0.4);
    for (let i = 0; i < NS; i++) {
      const o = STARS + i * SS; const dx = s[o] - ix; const dy = s[o + 1] - iy; const d2 = dx * dx + dy * dy;
      if (d2 > R * R) continue;
      const d = Math.sqrt(d2) + 0.01; const f = 1 - d / R; const dep = s[o + 4];
      if (kind === KIND.supernova) { const p = 900 * st * f * f * (0.4 + dep); s[o + 2] += (dx / d) * p; s[o + 3] += (dy / d) * p; s[o + 7] = Math.min(2, s[o + 7] + f * 1.4); }
      else if (kind === KIND.trounoir) { const p = 420 * st * f * (0.4 + dep); s[o + 2] += (-dy / d) * p; s[o + 3] += (dx / d) * p; s[o + 7] = Math.min(1.5, s[o + 7] + f); }
      else { s[o + 7] = Math.min(2, s[o + 7] + f * 1.6 * st); const p = -60 * st * f * dep; s[o + 2] += (dx / d) * p; s[o + 3] += (dy / d) * p; }
    }
    // A shooting star leaves from the finger.
    for (let m = 0; m < NM; m++) {
      const o = METEORS + m * MS; if (s[o + 4] > 0) continue;
      const a = Math.PI * (0.62 + Math.random() * 0.26); const sp = 900 + Math.random() * 400;
      s[o] = ix; s[o + 1] = iy; s[o + 2] = Math.cos(a) * sp; s[o + 3] = Math.sin(a) * sp; s[o + 4] = 1; break;
    }
  }

  // ── Background light: nebula clouds, aurora curtains, the nova, the hole ──
  const big = Math.max(W, H);
  const blobAlpha = kind === KIND.nebuleuse ? 0.2 : kind === KIND.aurore ? 0.07 : kind === KIND.supernova ? 0.08 : 0.05;
  for (let i = 0; i < NB; i++) {
    const o = BLOBS + i * BS; const dep = s[o + 5];
    s[o] += Math.sin(t * 0.05 + s[o + 4]) * 6 * dt; s[o + 1] += Math.cos(t * 0.04 + s[o + 4] * 1.3) * 5 * dt;
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.3 + s[o + 4]);
    op(s, T_GLOW, s[o] + camX * dep, s[o + 1] + camY * dep, s[o + 2], s[o + 2] * (0.62 + 0.25 * Math.sin(s[o + 4])), blobAlpha * pulse * (0.7 + 0.3 * k), s[o + 3], s[o + 4]);
  }

  if (kind === KIND.aurore) {
    const n = 26; const amp = 26 + s[6] * 40;
    for (let r = 0; r < 3; r++) {
      const base = H * (0.14 + r * 0.11); const dep = 0.15 + r * 0.12; const col = r === 1 ? 1 : r === 2 ? 2 : 0;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1); const x = u * W * 1.2 - W * 0.1;
        const y = base + Math.sin(u * 5.2 + t * (0.35 + r * 0.12) + r * 2) * amp + Math.sin(u * 13 + t * 0.9) * amp * 0.25;
        const h = 110 + 70 * (0.5 + 0.5 * Math.sin(u * 7 + t * 0.6 + r));
        const a = (0.1 + 0.06 * Math.sin(u * 9 - t * 1.3 + r)) * (0.8 + 0.2 * k);
        op(s, T_GLOW, x + camX * dep, y + h * 0.45 + camY * dep, W / n * 1.5, h, a, col, 0);
      }
    }
  }

  if (kind === KIND.supernova) {
    const c = novaCenter(W, H); const p = 0.85 + 0.15 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 5.3);
    op(s, T_GLOW, c[0] + camX * 0.1, c[1] + camY * 0.1, big * 0.62 * p, big * 0.62 * p, 0.32, 1, 0);
    op(s, T_GLOW, c[0] + camX * 0.15, c[1] + camY * 0.15, big * 0.34 * p, big * 0.34 * p, 0.5, 0, 0);
    op(s, T_GLOW, c[0] + camX * 0.2, c[1] + camY * 0.2, big * 0.13, big * 0.13, 0.85, 2, 0);
    if (s[10] < 1.1) {
      s[10] += dt; const a = s[10];
      op(s, T_RING, s[8], s[9], 40 + a * 620, 3 + (1 - a) * 5, (1 - a / 1.1) * 0.9, 0, 0);
      op(s, T_GLOW, s[8], s[9], 90 + a * 300, 90 + a * 300, (1 - a / 1.1) * 0.25, 1, 0);
    }
  }

  const hole = holeCenter(W, H); const hx = hole[0] + camX * 0.25; const hy = hole[1] + camY * 0.25; const hr = hole[2];
  if (kind === KIND.trounoir) {
    op(s, T_GLOW, hx, hy, hr * 5.5, hr * 2.4, 0.14, 2, 0);
    // Far half of the accretion disk (behind the hole).
    for (let i = 0; i < ND; i++) {
      const o = DISK + i * DS; s[o] += s[o + 2] * dt * (1 + s[6] * 0.4);
      const sn = Math.sin(s[o]); if (sn > 0) continue;
      const x = hx + Math.cos(s[o]) * s[o + 1]; const y = hy + sn * s[o + 1] * 0.3;
      const doppler = 0.55 + 0.45 * Math.cos(s[o]);
      op(s, T_STAR, x, y, s[o + 3], 0, 0.55 * doppler, s[o + 1] < hr * 1.8 ? 1 : 0, 0);
    }
  }

  // ── Stars ──
  const count = Math.min(NS, visible);
  const hyper = kind === KIND.trounoir && speed > 250;
  for (let i = 0; i < NS; i++) {
    const o = STARS + i * SS; const dep = s[o + 4];
    let ax = 0; let ay = 0;
    if (kind === KIND.trounoir) {
      const dx = s[o] - hole[0]; const dy = s[o + 1] - hole[1]; const d = Math.sqrt(dx * dx + dy * dy) + 1;
      const g = 2600 / (d * 0.02 + 1) * (0.3 + dep) / d;
      ax += (-dy / d) * g * 0.5 - (dx / d) * g * 0.22; ay += (dx / d) * g * 0.5 - (dy / d) * g * 0.22;
      if (hyper) { ax += (dx / d) * speed * 1.6 * dep; ay += (dy / d) * speed * 1.6 * dep; }
      if (d < hr * 1.15) { spawnStar(s, i, W, H, kind, false); continue; }
    } else {
      ax += Math.sin(t * 0.2 + s[o + 6]) * 2 * dep; ay += Math.cos(t * 0.17 + s[o + 6]) * 2 * dep;
      ay += fy * 0.9 * dep; ax += fx * 0.9 * dep;
    }
    const drag = kind === KIND.supernova ? Math.exp(-0.25 * dt) : Math.exp(-1.1 * dt);
    s[o + 2] = (s[o + 2] + ax * dt) * drag; s[o + 3] = (s[o + 3] + ay * dt) * drag;
    s[o] += s[o + 2] * dt; s[o + 1] += s[o + 3] * dt;
    s[o + 7] *= Math.exp(-1.3 * dt);
    if (!Number.isFinite(s[o]) || !Number.isFinite(s[o + 1])) { spawnStar(s, i, W, H, kind, true); continue; }
    const m = 40;
    if (s[o] < -m || s[o] > W + m || s[o + 1] < -m || s[o + 1] > H + m) {
      if (kind === KIND.supernova || kind === KIND.trounoir) spawnStar(s, i, W, H, kind, false);
      else { s[o] = (s[o] + W + 2 * m) % (W + 2 * m) - m; s[o + 1] = (s[o + 1] + H + 2 * m) % (H + 2 * m) - m; }
    }
    if (i >= count) continue;
    const x = s[o] + camX * dep; const y = s[o + 1] + camY * dep;
    const tw = 0.62 + 0.38 * Math.sin(t * (0.8 + s[o + 6] * 0.7) + s[o + 6] * 7);
    const heat = s[o + 7];
    const alpha = (0.28 + dep * 0.72) * tw * (0.75 + 0.25 * k) + heat * 0.4;
    const col = (i % 7 === 0) ? 1 : (i % 5 === 0) ? 2 : (i % 3 === 0) ? 0 : 3;
    const vel = Math.sqrt(s[o + 2] * s[o + 2] + s[o + 3] * s[o + 3]);
    if ((hyper || vel > 260) && dep > 0.3) {
      const len = Math.min(140, vel * 0.09 * dep + 6);
      op(s, T_STREAK, x, y, len, s[o + 5] * 0.9, alpha * 0.85, col, Math.atan2(-s[o + 3], -s[o + 2]));
    }
    op(s, T_STAR, x, y, s[o + 5] * (1 + heat * 0.6), 0, alpha, col, 0);
  }

  if (kind === KIND.trounoir) {
    // The hole itself, its photon ring, then the near half of the disk.
    op(s, T_HOLE, hx, hy, hr, 0, 1, 3, 0);
    op(s, T_RING, hx, hy, hr * 1.06, 2.4, 0.85, 0, 0);
    for (let i = 0; i < ND; i++) {
      const o = DISK + i * DS; const sn = Math.sin(s[o]); if (sn <= 0) continue;
      const x = hx + Math.cos(s[o]) * s[o + 1]; const y = hy + sn * s[o + 1] * 0.3;
      const doppler = 0.55 + 0.45 * Math.cos(s[o]);
      op(s, T_STAR, x, y, s[o + 3] * 1.4, 0, doppler, s[o + 1] < hr * 1.8 ? 1 : 0, 0);
    }
  }

  // ── Shooting stars: one now and then, and from every tap ──
  s[7] -= dt;
  if (s[7] <= 0) {
    s[7] = 5 + Math.random() * 6;
    for (let m = 0; m < NM; m++) {
      const o = METEORS + m * MS; if (s[o + 4] > 0) continue;
      const a = Math.PI * (0.65 + Math.random() * 0.2); const sp = 850 + Math.random() * 450;
      s[o] = W * (0.4 + Math.random() * 0.7); s[o + 1] = -20 + Math.random() * H * 0.25; s[o + 2] = Math.cos(a) * sp; s[o + 3] = Math.sin(a) * sp; s[o + 4] = 1; break;
    }
  }
  for (let m = 0; m < NM; m++) {
    const o = METEORS + m * MS; if (s[o + 4] <= 0) continue;
    s[o] += s[o + 2] * dt; s[o + 1] += s[o + 3] * dt; s[o + 4] -= dt * 1.1;
    const a = Math.max(0, s[o + 4]); const ang = Math.atan2(-s[o + 3], -s[o + 2]);
    op(s, T_STREAK, s[o], s[o + 1], 160 * a + 30, 2.2, a, 3, ang);
    op(s, T_GLOW, s[o], s[o + 1], 16, 16, a * 0.9, 0, 0);
  }
}
