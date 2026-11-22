import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { adaptVisible, PARTICLE_COUNT, useNeon } from '../neon/NeonProvider';
import { PALETTES, useTheme, type LockedId } from '../lib/theme';
import { KIND, NS, OP, STATE_LEN, stepSky, T_GLOW, T_HOLE, T_RING, T_STAR, T_STREAK } from './sky';

// Web renderer of the Galaxy sky (2D canvas). Same simulation as the phone (sky.ts).

type RGB = [number, number, number];
function sprite(stops: Array<[number, string]>): HTMLCanvasElement {
  const n = 128; const c = document.createElement('canvas'); c.width = n; c.height = n;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  for (const [at, col] of stops) gr.addColorStop(at, col);
  g.fillStyle = gr; g.fillRect(0, 0, n, n); return c;
}

export default function GalaxyBackground({ variant }: { variant: LockedId }) {
  const host = useRef<HTMLDivElement | null>(null);
  const { impulses, flow, tilt, intensity } = useNeon();
  const { galaxy } = PALETTES[variant];

  useEffect(() => {
    const root = host.current; if (!root || !galaxy) return;
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const colors: RGB[] = [galaxy.a, galaxy.b, galaxy.c, [255, 255, 255]];
    const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const glows = colors.map((c) => sprite([[0, rgba(c, 1)], [0.3, rgba(c, 0.38)], [0.65, rgba(c, 0.08)], [1, rgba(c, 0)]]));
    const stars = colors.map((c) => sprite([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,255,255,0.95)'], [0.25, rgba(c, 0.45)], [1, rgba(c, 0)]]));
    const kind = KIND[variant];
    let W = 0; let H = 0;
    const resize = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); W = root.clientWidth; H = root.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const s: number[] = []; const quality = [16, PARTICLE_COUNT, 0];
    let last = performance.now(); let clock = 0; let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const raw = Math.max(0.001, (now - last) / 1000); last = now;
      const v = raw > 0.25 ? quality[1] : adaptVisible(quality, raw);
      const dt = Math.min(0.05, raw); clock += dt;
      const queue = impulses.value; if (queue.length) impulses.value = [];
      const f = flow.value; const fx = f[0]; const fy = f[1];
      stepSky(s, dt, clock, W, H, kind, queue, tilt.value, f, intensity.value, Math.round((NS * v) / PARTICLE_COUNT));
      if (fx !== 0 || fy !== 0) { const d = Math.exp(-5 * dt); flow.value = Math.abs(fx) + Math.abs(fy) < 2 ? [0, 0] : [fx * d, fy * d]; }

      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#030306'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = STATE_LEN; i + OP <= s.length; i += OP) {
        const type = s[i]; const x = s[i + 1]; const y = s[i + 2]; const rx = s[i + 3]; const ry = s[i + 4]; const a = s[i + 5]; const c = s[i + 6]; const ang = s[i + 7];
        ctx.globalAlpha = a;
        if (type === T_GLOW) {
          if (ang) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.drawImage(glows[c], -rx, -ry, rx * 2, ry * 2); ctx.restore(); }
          else ctx.drawImage(glows[c], x - rx, y - ry, rx * 2, ry * 2);
        } else if (type === T_STAR) {
          const r = rx * 4; ctx.drawImage(stars[c], x - r, y - r, r * 2, r * 2);
        } else if (type === T_STREAK) {
          const ex = x + Math.cos(ang) * rx; const ey = y + Math.sin(ang) * rx;
          const gr = ctx.createLinearGradient(x, y, ex, ey); gr.addColorStop(0, rgba(colors[c], 1)); gr.addColorStop(1, rgba(colors[c], 0));
          ctx.strokeStyle = gr; ctx.lineWidth = ry; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        } else if (type === T_RING) {
          ctx.strokeStyle = rgba(colors[c], 1); ctx.lineWidth = ry; ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.stroke();
        } else if (type === T_HOLE) {
          ctx.globalCompositeOperation = 'source-over';
          const gr = ctx.createRadialGradient(x, y, 0, x, y, rx * 1.3); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.75, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rx * 1.3, 0, Math.PI * 2); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); canvas.remove(); };
  }, [variant, galaxy, impulses, flow, tilt, intensity]);

  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#030306' }]}>
    <View ref={(node) => { host.current = node as unknown as HTMLDivElement | null; }} style={StyleSheet.absoluteFill} />
  </View>;
}
