import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, GestureResponderEvent, Platform, StyleSheet, View } from 'react-native';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';

// ─────────────────────────────────────────────────────────────────────────────
// Neon particle field — input side.
// Collects everything that should stir the dust (touches, drags, scrolling,
// phone motion) into shared values that the UI-thread simulation reads.
// ─────────────────────────────────────────────────────────────────────────────

export const PARTICLE_COUNT = 130;
/** Per particle: x, y, vx, vy, size, heat, phase, depth */
export const STRIDE = 8;

export const IMPULSE_TAP = 0;
export const IMPULSE_SHAKE = 1;

export interface NeonInputs {
  /** Flat queue: [x, y, strength, kind, …] consumed by the simulation each frame. */
  impulses: SharedValue<number[]>;
  /** Drag / scroll flow in px/s: [vx, vy]. */
  flow: SharedValue<number[]>;
  /** Phone tilt change (high-pass filtered accelerometer): [x, y]. */
  tilt: SharedValue<number[]>;
  /** 1 normally, lower when the OS asks for reduced motion. */
  intensity: SharedValue<number>;
}

interface NeonApi extends NeonInputs {
  /** Punch the dust at a screen position (strength ≈ 0.3 – 2). */
  impulse: (x: number, y: number, strength?: number) => void;
  /** Feed a scroll offset so the dust follows the content. */
  scrollTo: (key: string, offsetY: number) => void;
}

const Ctx = createContext<NeonApi | null>(null);

/** Screen coordinates of a touch, whatever the platform puts them on. */
export function touchPoint(e: GestureResponderEvent): { pageX: number; pageY: number } {
  const n = e.nativeEvent as GestureResponderEvent['nativeEvent'] & { clientX?: number; clientY?: number };
  const first = n.touches?.[0] ?? n.changedTouches?.[0];
  const pageX = Number.isFinite(n.pageX) ? n.pageX : first?.pageX ?? n.clientX ?? NaN;
  const pageY = Number.isFinite(n.pageY) ? n.pageY : first?.pageY ?? n.clientY ?? NaN;
  return { pageX, pageY };
}

export function useNeon(): NeonApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useNeon must be used inside <NeonProvider>');
  return api;
}
/** Same as useNeon but returns null outside the provider (for optional effects). */
export function useNeonOptional(): NeonApi | null { return useContext(Ctx); }

export function NeonProvider({ children }: { children: React.ReactNode }) {
  const inputs = useMemo<NeonInputs>(() => ({
    impulses: makeMutable<number[]>([]),
    flow: makeMutable<number[]>([0, 0]),
    tilt: makeMutable<number[]>([0, 0]),
    intensity: makeMutable(1),
  }), []);

  const impulse = useCallback((x: number, y: number, strength = 1) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(strength)) return;
    const queue = inputs.impulses.value;
    // Keep the queue short: a burst of taps between two frames merges naturally.
    inputs.impulses.value = queue.length > 40 ? [x, y, strength, IMPULSE_TAP] : [...queue, x, y, strength, IMPULSE_TAP];
  }, [inputs]);

  const addFlow = useCallback((vx: number, vy: number) => {
    const [fx, fy] = inputs.flow.value;
    const clamp = (v: number) => Math.max(-2600, Math.min(2600, v));
    inputs.flow.value = [clamp(fx + vx), clamp(fy + vy)];
  }, [inputs]);

  // Scroll: velocity from successive offsets, per scroll view.
  const scrolls = useRef(new Map<string, { y: number; t: number }>()).current;
  const scrollTo = useCallback((key: string, offsetY: number) => {
    const now = Date.now(); const last = scrolls.get(key); scrolls.set(key, { y: offsetY, t: now });
    if (!last) return;
    const dt = Math.max(8, now - last.t) / 1000;
    const velocity = (offsetY - last.y) / dt; // content moving up = positive
    if (Math.abs(velocity) > 20 && dt < 0.2) addFlow(0, -velocity * 0.35);
  }, [addFlow, scrolls]);

  // Touches: a punch where the finger lands, a trail of dust while it drags.
  const lastMove = useRef<{ x: number; y: number; t: number; punched: number } | null>(null);
  const onTouchStart = useCallback((e: GestureResponderEvent) => {
    const { pageX, pageY } = touchPoint(e);
    impulse(pageX, pageY, 0.9);
    lastMove.current = { x: pageX, y: pageY, t: Date.now(), punched: Date.now() };
  }, [impulse]);
  const onTouchMove = useCallback((e: GestureResponderEvent) => {
    const { pageX, pageY } = touchPoint(e); if (!Number.isFinite(pageX) || !Number.isFinite(pageY)) return; const now = Date.now(); const last = lastMove.current;
    if (!last) { lastMove.current = { x: pageX, y: pageY, t: now, punched: now }; return; }
    const dt = Math.max(8, now - last.t) / 1000;
    addFlow(((pageX - last.x) / dt) * 0.25, ((pageY - last.y) / dt) * 0.25);
    let punched = last.punched;
    if (now - punched > 70) { impulse(pageX, pageY, 0.28); punched = now; }
    lastMove.current = { x: pageX, y: pageY, t: now, punched };
  }, [addFlow, impulse]);
  const onTouchEnd = useCallback(() => { lastMove.current = null; }, []);

  // Phone motion: tilt drifts the dust, a shake blows it everywhere.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | undefined; let cancelled = false;
    const base = { x: 0, y: 0, z: 0, ready: false }; let lastShake = 0;
    Accelerometer.isAvailableAsync().then((ok) => {
      if (!ok || cancelled) return;
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        if (!base.ready) { base.x = x; base.y = y; base.z = z; base.ready = true; }
        // High-pass: only *changes* of orientation move the dust, then it settles.
        base.x += (x - base.x) * 0.04; base.y += (y - base.y) * 0.04; base.z += (z - base.z) * 0.04;
        const dx = x - base.x; const dy = y - base.y; const dz = z - base.z;
        inputs.tilt.value = [dx, -dy];
        const jolt = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const now = Date.now();
        if (jolt > 1.1 && now - lastShake > 600) {
          lastShake = now;
          inputs.impulses.value = [...inputs.impulses.value, 0, 0, Math.min(2, jolt), IMPULSE_SHAKE];
        }
      });
    }).catch(() => undefined);
    return () => { cancelled = true; sub?.remove(); };
  }, [inputs]);

  // Respect « reduce motion ».
  useEffect(() => {
    let mounted = true;
    const apply = (reduced: boolean) => { if (mounted) inputs.intensity.value = reduced ? 0.35 : 1; };
    AccessibilityInfo.isReduceMotionEnabled?.().then(apply).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', apply);
    return () => { mounted = false; sub?.remove?.(); };
  }, [inputs]);

  const api = useMemo<NeonApi>(() => ({ ...inputs, impulse, scrollTo }), [inputs, impulse, scrollTo]);

  return <Ctx.Provider value={api}>
    {/* Touch events bubble up here without ever stealing them from buttons or scroll views. */}
    <View style={styles.fill} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>{children}</View>
  </Ctx.Provider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
