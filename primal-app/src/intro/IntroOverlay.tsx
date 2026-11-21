import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { glow, useTheme } from '../lib/theme';
import { FONTS } from '../lib/fonts';
import { I18nText as Text } from '../components/I18nText';
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
  const { theme, ambience } = useTheme();
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
  const sound = useRef<AudioPlayer | null>(null);
  const hapticTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // On the web, browsers only allow sound after a tap: wait for one before starting.
  const [armed, setArmed] = useState(Platform.OS !== 'web');
  const waitPulse = useRef(new Animated.Value(0)).current;

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
    if (armed) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(waitPulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(waitPulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [armed, waitPulse]);

  useEffect(() => {
    if (!armed) return;
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
      if (ambience.introSound && native) playIntroSound(); // web: already started in the tap handler
      if (ambience.introHaptics && native) scheduleIntroHaptics();
      sequence.current = Animated.sequence([
        Animated.timing(appear, { toValue: 1, duration: APPEAR, easing: Easing.out(Easing.back(1.4)), useNativeDriver: native }),
        Animated.delay(HOLD),
        Animated.timing(charge, { toValue: 1, duration: CHARGE, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
      ]);
      sequence.current.start(({ finished: done }) => {
        if (!done || cancelled) return;
        // The punch: shock wave in the background dust + a short haptic.
        neon?.impulse(cx, cy, 1.8);
        sequence.current = Animated.timing(burst, { toValue: 1, duration: BURST, easing: Easing.out(Easing.cubic), useNativeDriver: native });
        sequence.current.start(finish);
      });
    };
    AccessibilityInfo.isReduceMotionEnabled?.().then(run).catch(() => run(false)) ?? run(false);
    return () => { cancelled = true; sequence.current?.stop(); stopSound(); clearHaptics(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);

  // Launch sound (assets/sounds/intro.m4a, made by tools/make-intro-sound.py), timed to the animation.
  // Muted by the phone's silent switch and mixed with any music already playing.
  function playIntroSound() {
    try {
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
      const player = createAudioPlayer(require('../../assets/sounds/intro.m4a'));
      player.volume = 0.8;
      player.play();
      sound.current = player;
    } catch { /* never block the app for a sound (e.g. browser autoplay rules) */ }
  }
  function stopSound() {
    const player = sound.current; sound.current = null;
    if (!player) return;
    // Let the tail ring out briefly before releasing the player.
    setTimeout(() => { try { player.pause(); player.remove(); } catch { /* already released */ } }, 1500);
  }

  // Light haptics timed to the animation: a tick when the logo appears, three soft
  // pulses while it charges, a rounded « soft » hit at the burst. Phones only.
  function scheduleIntroHaptics() {
    const tap = (fn: () => Promise<void>) => () => { fn().catch(() => undefined); };
    const chargeStart = APPEAR + HOLD;
    const plan: Array<[number, () => void]> = [
      [0, tap(() => Haptics.selectionAsync())],
      [chargeStart + CHARGE * 0.25, tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))],
      [chargeStart + CHARGE * 0.55, tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))],
      [chargeStart + CHARGE * 0.8, tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))],
      [chargeStart + CHARGE, tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft))],
    ];
    hapticTimers.current = plan.map(([delay, fn]) => setTimeout(fn, delay));
  }
  function clearHaptics() { hapticTimers.current.forEach(clearTimeout); hapticTimers.current = []; }

  const skip = () => {
    clearHaptics();
    sound.current?.pause();
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

  if (!armed) {
    // Web entry screen: the tap is the user gesture that unlocks sound.
    const enter = () => { if (ambience.introSound) playIntroSound(); setArmed(true); };
    const waitOpacity = waitPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
    const waitScale = waitPulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.02] });
    const small = size * 0.62;
    return <Pressable accessibilityRole="button" accessibilityLabel="Entrer dans PRIMAL" onPress={enter} style={[StyleSheet.absoluteFill, styles.gate]}>
      <Animated.View style={[{ width: small, height: small, borderRadius: small / 2, overflow: 'hidden', opacity: waitOpacity, transform: [{ scale: waitScale }] }, glow(theme.neon, 0.8)]}>
        <Image source={logo} style={{ width: small, height: small }} />
      </Animated.View>
      <Animated.Text style={[FONTS.text.semibold, styles.gateText, { color: theme.text, opacity: waitOpacity }]}>Touchez pour entrer</Animated.Text>
      <Text style={[FONTS.text.regular, styles.gateHint, { color: theme.sub }]}>{ambience.introSound ? 'Avec le son' : 'Son désactivé dans les réglages'}</Text>
    </Pressable>;
  }

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
  gate: { backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  gateText: { fontSize: 17, letterSpacing: 0.6, marginTop: 34 },
  gateHint: { fontSize: 12, marginTop: 8 },
  halo: { position: 'absolute' },
  particle: { position: 'absolute' },
});
