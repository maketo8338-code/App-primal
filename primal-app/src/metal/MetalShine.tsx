import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * « Métal » finish: a narrow band of light that sweeps across a polished
 * surface every few seconds (buttons, the + orb). Put it inside a parent with
 * overflow: 'hidden' and a border radius.
 */
export default function MetalShine({ every = 4200, delay = 0, strength = 0.55 }: { every?: number; delay?: number; strength?: number }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!w) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(x, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(Math.max(0, every - 900 - delay)),
      Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [w, x, every, delay]);
  const band = Math.max(24, w * 0.35);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
    {w ? <Animated.View style={{ position: 'absolute', top: -20, bottom: -20, width: band, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-band * 1.5, w + band * 0.5] }) }, { rotate: '18deg' }] }}>
      <LinearGradient colors={['rgba(255,255,255,0)', `rgba(255,255,255,${strength})`, 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View> : null}
  </View>;
}

/** Brushed-metal top edge on a card: a thin light line that fades at both ends. */
export function MetalEdge({ color }: { color: string }) {
  return <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', color, 'rgba(0,0,0,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1 }} />;
}
