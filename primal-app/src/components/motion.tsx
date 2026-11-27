import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { MOTION } from '../lib/theme';
import { touchPoint, useNeonOptional } from '../neon/NeonProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Motion primitives for VISOLIS: moderate, purely visual animations.
// They never change what a component does — only how it appears.
// All of them switch off when the phone's « reduce motion » setting is on.
// ─────────────────────────────────────────────────────────────────────────────

/** true when the user asked the OS to reduce motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((value) => { if (mounted) setReduced(!!value); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value: boolean) => setReduced(!!value));
    return () => { mounted = false; sub?.remove?.(); };
  }, []);
  return reduced;
}

/** Fades and lifts its children into place once, when first mounted. */
export function FadeInUp({ children, delay = 0, distance = 14, style }: { children: React.ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(progress, { toValue: 1, duration: MOTION.slow, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [delay, progress]);
  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Slow, gentle floating with a hint of rotation — like the floating jars of the reference. */
export function Float({ children, amplitude = 5, rotate = 1.4, duration = MOTION.float, style }: { children: React.ReactNode; amplitude?: number; rotate?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [duration, reduced, t]);
  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [amplitude, -amplitude] });
  const rotateZ = t.interpolate({ inputRange: [0, 1], outputRange: [`${-rotate}deg`, `${rotate}deg`] });
  return <Animated.View style={[style, { transform: [{ perspective: 800 }, { translateY }, { rotateZ }] }]}>{children}</Animated.View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A Pressable that tilts back in 3D perspective and sinks slightly when touched.
 * Drop-in replacement for `<Pressable onPress style>`: same press behaviour.
 */
export function Pressable3D({ children, style, tilt = 6, sink = 0.975, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style' | 'children'> & { children?: React.ReactNode; style?: StyleProp<ViewStyle>; tilt?: number; sink?: number }) {
  const reduced = useReducedMotion();
  const neon = useNeonOptional();
  const pressed = useRef(new Animated.Value(0)).current;
  const to = (value: number) => Animated.spring(pressed, { toValue: value, useNativeDriver: true, ...MOTION.spring }).start();
  const scale = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, sink] });
  const rotateX = pressed.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${tilt}deg`] });
  const transform = reduced ? [{ scale }] : [{ perspective: 900 }, { rotateX }, { scale }];
  return <AnimatedPressable accessibilityRole="button" {...rest} onPressIn={(event) => { to(1); if (!rest.disabled) { const p = touchPoint(event); neon?.impulse(p.pageX, p.pageY, 0.7); } onPressIn?.(event); }} onPressOut={(event) => { to(0); onPressOut?.(event); }} style={[style, { transform }]}>{children}</AnimatedPressable>;
}
