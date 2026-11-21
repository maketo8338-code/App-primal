import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { glow, useTheme } from '../lib/theme';
import { useAppIcon } from '../lib/appAssets';
import { useNeonOptional } from '../neon/NeonProvider';
import { LOGO_POINTS } from './logoPoints';

// ─────────────────────────────────────────────────────────────────────────────
// Launch animation (motion design), about 2.5 s:
//   1. the logo of the chosen ambience appears, large, on black;
//   2. it charges up (pulse + glow);
//   3. it bursts into particles shaped like the logo, which fly to the sides,
//      rise and evaporate while the app is revealed behind them.
// Tap to skip. With « reduce motion » on, it becomes a short fade.
// Driven by Animated with the native driver (runs on the UI thread on phones).
// ─────────────────────────────────────────────────────────────────────────────

let playedThisLaunch = false;

const APPEAR = 700;
const HOLD = 180;
const CHARGE = 520;
const BURST = 1900;

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function IntroOverlay() {
  const [visible, setVisible] = useState(!playedThisLaunch);
  if (!visible) return null;
  return <Intro onDone={() => { playedThisLaunch = true; setVisible(false); }} />;
}

function Intro({ onDone }: { onDone: () => void }) {
  const { theme } = useTheme();
  const logo = useAppIcon();
  const neon = useNeonOptional();
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.62, 300);
  const cx = width / 2; const cy = height / 2 - 20;

  const appear = useRef(new Animated.Value(0)).current;
  const charge = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);
  const sequence = useRef<Animated.CompositeAnimation | null>(null);

  const finish = () => { if (finished.current) return; finished.current = true; onDone(); };

  // Particle trajectories, computed once: left half flies left, right half right,
  // everything drifts upward and fades — like vapour leaving the logo.
  const particles = useMemo(() => LOGO_POINTS.map(([px, py, kind, s], i) => {
    const r1 = rand(i + 1); const r2 = rand(i + 101); const r3 = rand(i + 211);
    const side = px < 0.5 ? -1 : 1;
    const spread = 0.55 + Math.abs(px - 0.5) * 1.4;
    const dx = side * (width * 0.32 + r1 * width * 0.55) * spread;
    const dy = (py - 0.5) * size * 0.6 - (70 + r2 * 190);
    const delay = Math.min(0.22, r3 * 0.12 + Math.abs(px - 0.5) * 0.12);
    const fadeAt = Math.min(0.94, delay + 0.55 + r1 * 0.3);
    const d = s * (size / 256) * 2.8;
    const x0 = cx - size / 2 + px * size; const y0 = cy - size / 2 + py * size;
    const color = kind === 1 ? theme.primary : '#FFFFFF';
    return {
      key: i, d, x0, y0, color,
      translateX: burst.interpolate({ inputRange: [0, delay, delay + (1 - delay) * 0.35, 1], outputRange: [0, 0, dx * 0.62, dx] }),
      translateY: burst.interpolate({ inputRange: [0, delay, delay + (1 - delay) * 0.35, 1], outputRange: [0, 0, dy * 0.35, dy] }),
      opacity: burst.interpolate({ inputRange: [0, 0.001, delay + 0.05, fadeAt, 1], outputRange: [0, 1, 1, 0.45, 0] }),
      scale: burst.interpolate({ inputRange: [0, delay, 1], outputRange: [1, 1.15, 0.2] }),
    };
  }), [burst, cx, cy, size, theme.primary, width]);

  useEffect(() => {
    let cancelled = false;
    const native = Platform.OS !== 'web';
    const run = (reduced: boolean) => {
      if (cancelled) return;
      if (reduced) {
        sequence.current = Animated.sequence([
          Animated.timing(appear, { toValue: 1, duration: 350, useNativeDriver: native }),
          Animated.delay(450),
          Animated.timing(exit, { toValue: 0, duration: 350, useNativeDriver: native }),
        ]);
        sequence.current.start(finish);
        return;
      }
      sequence.current = Animated.sequence([
        Animated.timing(appear, { toValue: 1, duration: APPEAR, easing: Easing.out(Easing.back(1.4)), useNativeDriver: native }),
        Animated.delay(HOLD),
        Animated.timing(charge, { toValue: 1, duration: CHARGE, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
      ]);
      sequence.current.start(({ finished: done }) => {
        if (!done || cancelled) return;
        // The punch: shock wave in the background dust + a short haptic.
        neon?.impulse(cx, cy, 1.8);
        if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        sequence.current = Animated.timing(burst, { toValue: 1, duration: BURST, easing: Easing.out(Easing.cubic), useNativeDriver: native });
        sequence.current.start(finish);
      });
    };
    AccessibilityInfo.isReduceMotionEnabled?.().then(run).catch(() => run(false)) ?? run(false);
    return () => { cancelled = true; sequence.current?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    sequence.current?.stop();
    Animated.timing(exit, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(finish);
  };

  // Logo: grows in, swells while charging, then pops and vanishes as the particles take over.
  const logoScale = Animated.add(
    Animated.add(appear.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }), charge.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] })),
    burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.18, 0.18] }),
  );
  const logoOpacity = Animated.multiply(appear, burst.interpolate({ inputRange: [0, 0.08, 1], outputRange: [1, 0, 0] }));
  // During the burst the halo flares briefly, then dies out (never a solid disc).
  const haloOpacity = Animated.multiply(appear, Animated.multiply(charge.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.5] }), burst.interpolate({ inputRange: [0, 0.05, 0.3], outputRange: [1, 0.7, 0], extrapolate: 'clamp' })));
  const haloScale = Animated.add(charge.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }), burst.interpolate({ inputRange: [0, 0.3], outputRange: [0, 0.9], extrapolate: 'clamp' }));
  const flashOpacity = burst.interpolate({ inputRange: [0, 0.03, 0.2], outputRange: [0, 0.35, 0], extrapolate: 'clamp' });
  const flashScale = burst.interpolate({ inputRange: [0, 0.2], outputRange: [0.5, 1.8], extrapolate: 'clamp' });
  const curtain = burst.interpolate({ inputRange: [0, 0.1, 0.55], outputRange: [1, 1, 0], extrapolate: 'clamp' });

  return <Animated.View style={[StyleSheet.absoluteFill, { opacity: exit, zIndex: 1000, elevation: 1000 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Passer l'introduction" onPress={skip} style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#050505', opacity: curtain }]} />
      <Animated.View pointerEvents="none" style={[styles.halo, { width: size * 1.1, height: size * 1.1, borderRadius: size * 0.55, left: cx - size * 0.55, top: cy - size * 0.55, backgroundColor: theme.neon, opacity: haloOpacity, transform: [{ scale: haloScale }] }, glow(theme.neon, 1.4)]} />
      <Animated.View pointerEvents="none" style={[styles.halo, { width: size, height: size, borderRadius: size / 2, left: cx - size / 2, top: cy - size / 2, backgroundColor: '#FFFFFF', opacity: flashOpacity, transform: [{ scale: flashScale }] }]} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: cx - size / 2, top: cy - size / 2, width: size, height: size, opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}><Image source={logo} style={{ width: size, height: size }} /></View>
      </Animated.View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {particles.map((p) => <Animated.View key={p.key} style={[styles.particle, { width: p.d, height: p.d, borderRadius: p.d / 2, left: p.x0 - p.d / 2, top: p.y0 - p.d / 2, backgroundColor: p.color, opacity: p.opacity, transform: [{ translateX: p.translateX }, { translateY: p.translateY }, { scale: p.scale }] }, glow(p.color === '#FFFFFF' ? theme.neon : p.color, 0.45)]} />)}
      </View>
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  halo: { position: 'absolute' },
  particle: { position: 'absolute' },
});
