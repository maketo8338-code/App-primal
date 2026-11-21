import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { BlendMode, Canvas, createPicture, Picture, Rect, Skia, TileMode, vec, PaintStyle, StrokeCap } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { adaptVisible, PARTICLE_COUNT, useNeon } from '../neon/NeonProvider';
import { PALETTES, type GalaxyId } from '../lib/theme';
import { KIND, NS, OP, STATE_LEN, stepSky, T_GLOW, T_HOLE, T_RING, T_STAR, T_STREAK } from './sky';

// Phone renderer of the Galaxy sky: simulation (sky.ts) and drawing both run
// on the UI thread with Skia, like the ember field.

export default function GalaxyField({ variant }: { variant: GalaxyId }) {
  const { width, height } = useWindowDimensions();
  const { impulses, flow, tilt, intensity } = useNeon();
  const galaxy = PALETTES[variant].galaxy!;
  const kind = KIND[variant];
  const dims = useSharedValue([width, height]);
  useEffect(() => { dims.value = [width, height]; }, [dims, width, height]);
  const sky = useSharedValue<number[]>([]);
  const clock = useSharedValue(0);
  const quality = useSharedValue<number[]>([16, PARTICLE_COUNT, 0]);

  // Unit-radius brushes per colour (a, b, c, white), scaled per draw. Additive light.
  const paints = useMemo(() => {
    const colors = [galaxy.a, galaxy.b, galaxy.c, [255, 255, 255] as [number, number, number]];
    const col = (c: number[], a: number) => Skia.Color(`rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`);
    const glows = colors.map((c) => { const p = Skia.Paint(); p.setAntiAlias(true); p.setBlendMode(BlendMode.Plus); p.setShader(Skia.Shader.MakeRadialGradient(vec(0, 0), 1, [col(c, 1), col(c, 0.38), col(c, 0.08), col(c, 0)], [0, 0.3, 0.65, 1], TileMode.Clamp)); return p; });
    const stars = colors.map((c) => { const p = Skia.Paint(); p.setAntiAlias(true); p.setBlendMode(BlendMode.Plus); p.setShader(Skia.Shader.MakeRadialGradient(vec(0, 0), 1, [col([255, 255, 255], 1), col([255, 255, 255], 0.95), col(c, 0.45), col(c, 0)], [0, 0.12, 0.25, 1], TileMode.Clamp)); return p; });
    const lines = colors.map((c) => { const p = Skia.Paint(); p.setAntiAlias(true); p.setBlendMode(BlendMode.Plus); p.setStyle(PaintStyle.Stroke); p.setStrokeCap(StrokeCap.Round); p.setColor(col(c, 1)); return p; });
    const hole = Skia.Paint(); hole.setAntiAlias(true);
    hole.setShader(Skia.Shader.MakeRadialGradient(vec(0, 0), 1.3, [Skia.Color('rgba(0,0,0,1)'), Skia.Color('rgba(0,0,0,1)'), Skia.Color('rgba(0,0,0,0)')], [0, 0.75, 1], TileMode.Clamp));
    return { glows, stars, lines, hole };
  }, [galaxy]);

  useFrameCallback((frame) => {
    'worklet';
    const raw = Math.max(0.001, (frame.timeSincePreviousFrame ?? 16) / 1000);
    const q = quality.value.slice(); const v = raw > 0.25 ? q[1] : adaptVisible(q, raw); quality.value = q;
    const dt = Math.min(0.05, raw); const t = clock.value + dt; clock.value = t;
    const queue = impulses.value; if (queue.length) impulses.value = [];
    const f = flow.value; const fx = f[0]; const fy = f[1];
    const W = dims.value[0]; const H = dims.value[1]; const tl = tilt.value; const k = intensity.value;
    sky.modify((s) => { 'worklet'; stepSky(s, dt, t, W, H, kind, queue, tl, f, k, Math.round((NS * v) / PARTICLE_COUNT)); return s; });
    if (fx !== 0 || fy !== 0) { const d = Math.exp(-5 * dt); flow.value = Math.abs(fx) + Math.abs(fy) < 2 ? [0, 0] : [fx * d, fy * d]; }
  });

  const picture = useDerivedValue(() => createPicture((canvas) => {
    'worklet';
    const s = sky.value; const { glows, stars, lines, hole } = paints;
    for (let i = STATE_LEN; i + OP <= s.length; i += OP) {
      const type = s[i]; const x = s[i + 1]; const y = s[i + 2]; const rx = s[i + 3]; const ry = s[i + 4]; const a = s[i + 5]; const c = s[i + 6]; const ang = s[i + 7];
      if (type === T_GLOW) {
        const p = glows[c]; p.setAlphaf(a); canvas.save(); canvas.translate(x, y); if (ang) canvas.rotate((ang * 180) / Math.PI, 0, 0); canvas.scale(rx, ry); canvas.drawCircle(0, 0, 1, p); canvas.restore();
      } else if (type === T_STAR) {
        const p = stars[c]; p.setAlphaf(a); const r = rx * 4; canvas.save(); canvas.translate(x, y); canvas.scale(r, r); canvas.drawCircle(0, 0, 1, p); canvas.restore();
      } else if (type === T_STREAK) {
        const p = lines[c]; p.setAlphaf(a); p.setStrokeWidth(ry); canvas.drawLine(x, y, x + Math.cos(ang) * rx, y + Math.sin(ang) * rx, p);
      } else if (type === T_RING) {
        const p = lines[c]; p.setAlphaf(a); p.setStrokeWidth(ry); canvas.drawCircle(x, y, rx, p);
      } else if (type === T_HOLE) {
        canvas.save(); canvas.translate(x, y); canvas.scale(rx, rx); canvas.drawCircle(0, 0, 1.3, hole); canvas.restore();
      }
    }
  }));

  return <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
    <Rect x={0} y={0} width={width} height={height} color="#030306" />
    <Picture picture={picture} />
  </Canvas>;
}
