import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { adaptVisible, IMPULSE_SHAKE, PARTICLE_COUNT as N, STRIDE, useNeon } from './NeonProvider';
import { useTheme } from '../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Web version of the neon particle field.
// Same physics as NeonField.tsx (native, Skia on the UI thread) — keep both in
// sync — but drawn with the browser's 2D canvas, so the web preview needs no
// WebAssembly and works on any page or link.
// ─────────────────────────────────────────────────────────────────────────────

const TAU = Math.PI * 2;

function makeSprite(stops: Array<[number, string]>): HTMLCanvasElement {
  const size = 128; const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d')!; const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad; g.fillRect(0, 0, size, size); return c;
}

export default function NeonBackground() {
  const host = useRef<HTMLDivElement | null>(null);
  const { impulses, flow, tilt, intensity } = useNeon();
  const { light } = useTheme().theme;

  useEffect(() => {
    const root = host.current; if (!root) return;
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;
    const halo = makeSprite([[0, rgba(light.halo, 1)], [0.22, rgba(light.halo, 0.44)], [0.55, rgba(light.edge, 0.09)], [1, rgba(light.edge, 0)]]);
    const core = makeSprite([[0, 'rgba(255,246,240,1)'], [0.4, rgba(light.core, 0.63)], [1, rgba(light.core, 0)]]);
    const hz = light.haze; const hz2: [number, number, number] = [Math.round(hz[0] / 2), Math.round(hz[1] / 2), Math.round(hz[2] / 2)]; const hz3: [number, number, number] = [Math.round(hz[0] / 3), Math.round(hz[1] / 3), Math.round(hz[2] / 3)];

    let W = 0; let H = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1); W = root.clientWidth; H = root.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);

    const d: number[] = []; let clock = 0; let energy = 0; let cursor = 0; const flash = [0, 0, 0];
    const spawnSize = (depth: number) => (3 + depth * 13) * (0.55 + Math.random() * 0.7);
    let last = performance.now(); let raf = 0; const quality = [16, N, 0];

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const rawDt = Math.max(0.001, (now - last) / 1000); last = now;
      // Ignore long pauses (hidden tab) so they don't count as slow frames.
      const visible = rawDt > 0.25 ? quality[1] : adaptVisible(quality, rawDt);
      const dt = Math.min(0.05, rawDt);
      const t = clock + dt; clock = t;
      const k = intensity.value;
      const queue = impulses.value; if (queue.length) impulses.value = [];
      const fx = flow.value[0]; const fy = flow.value[1]; const decay = Math.exp(-5 * dt);
      if (fx !== 0 || fy !== 0) flow.value = Math.abs(fx) + Math.abs(fy) < 2 ? [0, 0] : [fx * decay, fy * decay];
      const gx = tilt.value[0]; const gy = tilt.value[1];

      if (d.length !== N * STRIDE) {
        d.length = 0;
        for (let i = 0; i < N; i++) { const depth = 0.25 + Math.random() * 0.75; d.push(Math.random() * W, Math.random() * H, 0, 0, spawnSize(depth), 0, Math.random() * TAU, depth); }
      }

      // Impacts: shock wave + hot sparks.
      for (let q = 0; q + 3 < queue.length; q += 4) {
        const ix = queue[q]; const iy = queue[q + 1]; const s = queue[q + 2] * k; const kind = queue[q + 3];
        if (!Number.isFinite(s) || (kind !== IMPULSE_SHAKE && (!Number.isFinite(ix) || !Number.isFinite(iy)))) continue;
        if (kind === IMPULSE_SHAKE) {
          for (let i = 0; i < N; i++) { const o = i * STRIDE; const a = Math.random() * TAU; const p = (180 + Math.random() * 520) * s * d[o + 7]; d[o + 2] += Math.cos(a) * p; d[o + 3] += Math.sin(a) * p; d[o + 5] = Math.min(2, d[o + 5] + 0.5 * s); }
          continue;
        }
        const R = Math.max(150, Math.min(W, H) * 0.48);
        flash[0] = ix; flash[1] = iy; flash[2] = Math.min(1.4, flash[2] * 0.5 + 0.55 * s + 0.25);
        for (let i = 0; i < N; i++) {
          const o = i * STRIDE; const dx = d[o] - ix; const dy = d[o + 1] - iy; const d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          const dist = Math.sqrt(d2) + 0.001; const f = 1 - dist / R; const push = 1150 * s * f * f * (0.45 + d[o + 7]);
          d[o + 2] += (dx / dist) * push; d[o + 3] += (dy / dist) * push; d[o + 5] = Math.min(2.2, d[o + 5] + f * 1.5 * s);
        }
        const sparks = Math.round(Math.min(14, 9 * s));
        for (let n = 0; n < sparks; n++) {
          const i = cursor; cursor = (i + 1) % N; const o = i * STRIDE;
          const a = Math.random() * TAU; const speed = (260 + Math.random() * 760) * Math.min(1.4, s + 0.2);
          d[o] = ix + Math.cos(a) * 4; d[o + 1] = iy + Math.sin(a) * 4; d[o + 2] = Math.cos(a) * speed; d[o + 3] = Math.sin(a) * speed - 60;
          d[o + 4] = 1.8 + Math.random() * 4.2; d[o + 5] = 1.6 + Math.random() * 0.6;
        }
      }

      // Integrate: rising embers, sway, drag, flow, tilt.
      const drag = Math.exp(-1.35 * dt); const heatDecay = Math.exp(-1.7 * dt); let heatSum = 0;
      for (let i = 0; i < N; i++) {
        const o = i * STRIDE; const depth = d[o + 7]; const phase = d[o + 6];
        const ax = Math.sin(t * 0.55 + phase) * 9 * depth + gx * 520 * depth + fx * 1.6 * depth;
        const ay = -11 * depth + Math.cos(t * 0.42 + phase * 1.7) * 4 + gy * 520 * depth + fy * 1.6 * depth;
        d[o + 2] = (d[o + 2] + ax * dt) * drag; d[o + 3] = (d[o + 3] + ay * dt) * drag;
        d[o] += d[o + 2] * dt; d[o + 1] += d[o + 3] * dt; d[o + 5] *= heatDecay;
        if (!Number.isFinite(d[o]) || !Number.isFinite(d[o + 1]) || !Number.isFinite(d[o + 2]) || !Number.isFinite(d[o + 3]) || !Number.isFinite(d[o + 5])) { d[o] = Math.random() * W; d[o + 1] = Math.random() * H; d[o + 2] = 0; d[o + 3] = 0; d[o + 5] = 0; }
        heatSum += d[o + 5];
        const m = 30;
        if (d[o + 1] < -m) { d[o + 1] = H + m; d[o] = Math.random() * W; d[o + 4] = spawnSize(depth); d[o + 2] *= 0.2; d[o + 3] *= 0.2; }
        else if (d[o + 1] > H + m) { d[o + 1] = -m; d[o] = Math.random() * W; d[o + 4] = spawnSize(depth); d[o + 2] *= 0.2; d[o + 3] *= 0.2; }
        if (d[o] < -m) d[o] = W + m; else if (d[o] > W + m) d[o] = -m;
      }
      if (flash[2] > 0.002) flash[2] *= Math.exp(-3.2 * dt);
      energy += (heatSum / N - energy) * Math.min(1, dt * 5);

      // Draw.
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
      const haze = 0.55 + Math.min(0.9, energy * 2.2);
      const big = Math.max(W, H);
      for (const [cx, cy, r, c0, c1] of [[W * 0.82, -H * 0.02, big * 0.62, rgba(hz, 0.33), rgba(hz2, 0.13)], [W * 0.1, H * 1.02, big * 0.55, rgba(hz, 0.27), rgba(hz3, 0.09)]] as Array<[number, number, number, string, string]>) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, 'rgba(5,5,5,0)');
        ctx.globalAlpha = Math.min(1, haze); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'lighter';
      if (flash[2] > 0.01) { ctx.globalAlpha = Math.min(0.5, flash[2] * 0.38); ctx.drawImage(halo, flash[0] - 190, flash[1] - 190, 380, 380); }
      const glowK = 0.5 + 0.5 * Math.min(1.6, intensity.value);
      for (let i = 0; i < visible; i++) {
        const o = i * STRIDE; const depth = d[o + 7]; const heat = d[o + 5];
        const speed = Math.sqrt(d[o + 2] * d[o + 2] + d[o + 3] * d[o + 3]);
        const flicker = 0.72 + 0.28 * Math.sin(t * (1.4 + depth * 1.6) + d[o + 6] * 3);
        const alpha = Math.min(1, (0.22 + depth * 0.5) * flicker * glowK + heat * 0.45 + Math.min(0.3, speed * 0.0005));
        const r = d[o + 4] * (1 + Math.min(1.6, heat) * 0.55);
        ctx.globalAlpha = alpha; ctx.drawImage(halo, d[o] - r, d[o + 1] - r, r * 2, r * 2);
        const coreAlpha = Math.min(1, heat * 0.6 + (depth - 0.55) * 0.9);
        if (coreAlpha > 0.03) { const cr = r * 0.32; ctx.globalAlpha = coreAlpha * flicker; ctx.drawImage(core, d[o] - cr, d[o + 1] - cr, cr * 2, cr * 2); }
      }
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); canvas.remove(); };
  }, [flow, impulses, intensity, tilt, light]);

  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#050505' }]}>
    <View ref={(node) => { host.current = node as unknown as HTMLDivElement | null; }} style={StyleSheet.absoluteFill} />
  </View>;
}
