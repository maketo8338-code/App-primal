import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { BlendMode, Canvas, createPicture, Group, Picture, RadialGradient, Rect, Skia, TileMode, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { IMPULSE_SHAKE, PARTICLE_COUNT as N, STRIDE, useNeon } from './NeonProvider';
import { useTheme } from '../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Neon particle field — simulation + rendering, entirely on the UI thread.
// Dust of red neon light floating over black. Each particle carries:
//   x, y, vx, vy, size, heat (extra glow after a hit), phase, depth (parallax)
// ─────────────────────────────────────────────────────────────────────────────

const TAU = Math.PI * 2;

export default function NeonField() {
  const { width, height } = useWindowDimensions();
  const { impulses, flow, tilt, intensity } = useNeon();
  const { light } = useTheme().theme;
  const dims = useSharedValue([width, height]);
  useEffect(() => { dims.value = [width, height]; }, [dims, width, height]);

  const data = useSharedValue<number[]>([]);
  const clock = useSharedValue(0);
  const energy = useSharedValue(0);
  const cursor = useSharedValue(0);
  /** Light flash at the last impact: [x, y, intensity]. */
  const flash = useSharedValue<number[]>([0, 0, 0]);

  // Two shared glow brushes (unit radius, scaled per particle): a wide red halo
  // and a small white-hot core. Additive blending makes overlapping light add up.
  const brushes = useMemo(() => {
    const halo = Skia.Paint(); halo.setAntiAlias(true); halo.setBlendMode(BlendMode.Plus);
    const [hr, hg, hb] = light.halo; const [er, eg, eb] = light.edge; const [cr, cg, cb] = light.core;
    const rgba = (r: number, g: number, b: number, a: number) => Skia.Color(`rgba(${r}, ${g}, ${b}, ${a})`);
    halo.setShader(Skia.Shader.MakeRadialGradient(vec(0, 0), 1, [rgba(hr, hg, hb, 1), rgba(hr, hg, hb, 0.44), rgba(er, eg, eb, 0.09), rgba(er, eg, eb, 0)], [0, 0.22, 0.55, 1], TileMode.Clamp));
    const core = Skia.Paint(); core.setAntiAlias(true); core.setBlendMode(BlendMode.Plus);
    core.setShader(Skia.Shader.MakeRadialGradient(vec(0, 0), 1, [rgba(255, 246, 240, 1), rgba(cr, cg, cb, 0.63), rgba(cr, cg, cb, 0)], [0, 0.4, 1], TileMode.Clamp));
    return { halo, core };
  }, [light]);

  useFrameCallback((frame) => {
    'worklet';
    const dt = Math.min(0.05, Math.max(0.001, (frame.timeSincePreviousFrame ?? 16) / 1000));
    const W = dims.value[0]; const H = dims.value[1];
    const t = clock.value + dt; clock.value = t;
    const k = intensity.value;
    const queue = impulses.value;
    if (queue.length) impulses.value = [];
    const fx = flow.value[0]; const fy = flow.value[1];
    const decay = Math.exp(-5 * dt);
    if (fx !== 0 || fy !== 0) flow.value = Math.abs(fx) + Math.abs(fy) < 2 ? [0, 0] : [fx * decay, fy * decay];
    const gx = tilt.value[0]; const gy = tilt.value[1];

    data.modify((d) => {
      'worklet';
      const spawnSize = (depth: number) => (3 + depth * 13) * (0.55 + Math.random() * 0.7);
      if (d.length !== N * STRIDE) {
        d.length = 0;
        for (let i = 0; i < N; i++) {
          const depth = 0.25 + Math.random() * 0.75;
          d.push(Math.random() * W, Math.random() * H, 0, 0, spawnSize(depth), 0, Math.random() * TAU, depth);
        }
      }

      // ── Impacts: a shock wave pushes the dust away and throws hot sparks ──
      for (let q = 0; q + 3 < queue.length; q += 4) {
        const ix = queue[q]; const iy = queue[q + 1]; const s = queue[q + 2] * k; const kind = queue[q + 3];
        if (!Number.isFinite(s) || (kind !== IMPULSE_SHAKE && (!Number.isFinite(ix) || !Number.isFinite(iy)))) continue;
        if (kind === IMPULSE_SHAKE) {
          for (let i = 0; i < N; i++) {
            const o = i * STRIDE; const a = Math.random() * TAU; const p = (180 + Math.random() * 520) * s * d[o + 7];
            d[o + 2] += Math.cos(a) * p; d[o + 3] += Math.sin(a) * p; d[o + 5] = Math.min(2, d[o + 5] + 0.5 * s);
          }
          continue;
        }
        const R = Math.max(150, Math.min(W, H) * 0.48);
        flash.value = [ix, iy, Math.min(1.4, flash.value[2] * 0.5 + 0.55 * s + 0.25)];
        for (let i = 0; i < N; i++) {
          const o = i * STRIDE; const dx = d[o] - ix; const dy = d[o + 1] - iy; const d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          const dist = Math.sqrt(d2) + 0.001; const f = 1 - dist / R; const push = 1150 * s * f * f * (0.45 + d[o + 7]);
          d[o + 2] += (dx / dist) * push; d[o + 3] += (dy / dist) * push;
          d[o + 5] = Math.min(2.2, d[o + 5] + f * 1.5 * s);
        }
        // Sparks: recycle a few particles at the impact point.
        const sparks = Math.round(Math.min(14, 9 * s));
        for (let n = 0; n < sparks; n++) {
          const i = cursor.value; cursor.value = (i + 1) % N; const o = i * STRIDE;
          const a = Math.random() * TAU; const speed = (260 + Math.random() * 760) * Math.min(1.4, s + 0.2);
          d[o] = ix + Math.cos(a) * 4; d[o + 1] = iy + Math.sin(a) * 4;
          d[o + 2] = Math.cos(a) * speed; d[o + 3] = Math.sin(a) * speed - 60;
          d[o + 4] = 1.8 + Math.random() * 4.2; d[o + 5] = 1.6 + Math.random() * 0.6;
        }
      }

      // ── Integrate: rising embers, gentle sway, drag, flow, tilt ──
      const drag = Math.exp(-1.35 * dt);
      const heatDecay = Math.exp(-1.7 * dt);
      let heatSum = 0;
      for (let i = 0; i < N; i++) {
        const o = i * STRIDE; const depth = d[o + 7]; const phase = d[o + 6];
        const ax = Math.sin(t * 0.55 + phase) * 9 * depth + gx * 520 * depth + fx * 1.6 * depth;
        const ay = -11 * depth + Math.cos(t * 0.42 + phase * 1.7) * 4 + gy * 520 * depth + fy * 1.6 * depth;
        d[o + 2] = (d[o + 2] + ax * dt) * drag;
        d[o + 3] = (d[o + 3] + ay * dt) * drag;
        d[o] += d[o + 2] * dt; d[o + 1] += d[o + 3] * dt;
        d[o + 5] *= heatDecay;
        if (!Number.isFinite(d[o]) || !Number.isFinite(d[o + 1]) || !Number.isFinite(d[o + 2]) || !Number.isFinite(d[o + 3]) || !Number.isFinite(d[o + 5])) { d[o] = Math.random() * W; d[o + 1] = Math.random() * H; d[o + 2] = 0; d[o + 3] = 0; d[o + 5] = 0; }
        heatSum += d[o + 5];
        // Wrap around the screen; respawned particles get a fresh size.
        const m = 30;
        if (d[o + 1] < -m) { d[o + 1] = H + m; d[o] = Math.random() * W; d[o + 4] = spawnSize(depth); d[o + 2] *= 0.2; d[o + 3] *= 0.2; }
        else if (d[o + 1] > H + m) { d[o + 1] = -m; d[o] = Math.random() * W; d[o + 4] = spawnSize(depth); d[o + 2] *= 0.2; d[o + 3] *= 0.2; }
        if (d[o] < -m) d[o] = W + m; else if (d[o] > W + m) d[o] = -m;
      }
      const target = heatSum / N;
      if (flash.value[2] > 0.002) flash.value = [flash.value[0], flash.value[1], flash.value[2] * Math.exp(-3.2 * dt)];
      energy.value += (target - energy.value) * Math.min(1, dt * 5);
      return d;
    });
  });

  const picture = useDerivedValue(() => createPicture((canvas) => {
    'worklet';
    const d = data.value; if (d.length !== N * STRIDE) return;
    const t = clock.value; const { halo, core } = brushes;
    // Chosen intensity also sets how bright the dust glows at rest.
    const glowK = 0.5 + 0.5 * Math.min(1.6, intensity.value);
    // Impact flash: a short-lived glow that lights the room around the finger.
    const f = flash.value;
    if (f[2] > 0.01) { canvas.save(); canvas.translate(f[0], f[1]); canvas.scale(190, 190); halo.setAlphaf(Math.min(0.5, f[2] * 0.38)); canvas.drawCircle(0, 0, 1, halo); canvas.restore(); }
    for (let i = 0; i < N; i++) {
      const o = i * STRIDE; const depth = d[o + 7]; const heat = d[o + 5];
      const speed = Math.sqrt(d[o + 2] * d[o + 2] + d[o + 3] * d[o + 3]);
      const flicker = 0.72 + 0.28 * Math.sin(t * (1.4 + depth * 1.6) + d[o + 6] * 3);
      const alpha = Math.min(1, (0.22 + depth * 0.5) * flicker * glowK + heat * 0.45 + Math.min(0.3, speed * 0.0005));
      const radius = d[o + 4] * (1 + Math.min(1.6, heat) * 0.55);
      canvas.save(); canvas.translate(d[o], d[o + 1]); canvas.scale(radius, radius);
      halo.setAlphaf(alpha); canvas.drawCircle(0, 0, 1, halo);
      // Hot or close particles get a bright core: sparks look white-hot.
      const coreAlpha = Math.min(1, heat * 0.6 + (depth - 0.55) * 0.9);
      if (coreAlpha > 0.03) { core.setAlphaf(coreAlpha * flicker); canvas.drawCircle(0, 0, 0.32, core); }
      canvas.restore();
    }
  }));

  // The room lights up a little after each punch.
  const hazeOpacity = useDerivedValue(() => 0.55 + Math.min(0.9, energy.value * 2.2));
  const hazeTop = useMemo(() => vec(width * 0.82, -height * 0.02), [width, height]);
  const hazeBottom = useMemo(() => vec(width * 0.1, height * 1.02), [width, height]);

  return <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
    <Rect x={0} y={0} width={width} height={height} color="#050505" />
    <Group opacity={hazeOpacity}>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={hazeTop} r={Math.max(width, height) * 0.62} colors={[`rgba(${light.haze[0]}, ${light.haze[1]}, ${light.haze[2]}, 0.33)`, `rgba(${Math.round(light.haze[0] / 2)}, ${Math.round(light.haze[1] / 2)}, ${Math.round(light.haze[2] / 2)}, 0.13)`, '#05050500']} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={hazeBottom} r={Math.max(width, height) * 0.55} colors={[`rgba(${light.haze[0]}, ${light.haze[1]}, ${light.haze[2]}, 0.27)`, `rgba(${Math.round(light.haze[0] / 3)}, ${Math.round(light.haze[1] / 3)}, ${Math.round(light.haze[2] / 3)}, 0.09)`, '#05050500']} />
      </Rect>
    </Group>
    <Picture picture={picture} />
  </Canvas>;
}
