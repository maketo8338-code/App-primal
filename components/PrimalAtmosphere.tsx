import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { MOTION, useTheme } from '../lib/theme';
import { useReducedMotion } from './motion';

/**
 * Background of the whole app: a warm, sober cream (or espresso in dark mode)
 * with three very soft glows — terracotta, olive and ochre — drifting slowly.
 */
export default function PrimalAtmosphere() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const drift = useRef(new Animated.Value(0)).current;
  const counter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const make = (value: Animated.Value, duration: number) => Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const a = make(drift, MOTION.ambient);
    const b = make(counter, MOTION.ambient * 1.3);
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [counter, drift, reduced]);

  const dark = theme.mode === 'dark';
  const travel = Math.max(40, width * 0.12);
  const glow = (id: string, color: string, opacity: number) => <RadialGradient id={id} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={color} stopOpacity={opacity} /><Stop offset="1" stopColor={color} stopOpacity={0} /></RadialGradient>;
  const terracotta = dark ? '#7A2E2A' : '#E9A27C';
  const olive = dark ? '#3D4A2A' : '#C3CFA0';
  const ochre = dark ? '#5C3D1C' : '#F2CF97';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={theme.atmosphere} locations={[0, 0.55, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-travel, travel] }) }, { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.04] }) }] }]}>
        <Svg width={width + travel * 2} height={height + travel * 2} style={{ position: 'absolute', left: -travel, top: -travel }}>
          <Defs>{glow('gTerracotta', terracotta, dark ? 0.5 : 0.45)}{glow('gOchre', ochre, dark ? 0.4 : 0.4)}</Defs>
          <Ellipse cx={travel + width * 0.9} cy={travel + height * 0.08} rx={width * 0.7} ry={width * 0.6} fill="url(#gTerracotta)" />
          <Ellipse cx={travel + width * 0.05} cy={travel + height * 0.55} rx={width * 0.6} ry={width * 0.55} fill="url(#gOchre)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: counter.interpolate({ inputRange: [0, 1], outputRange: [travel, -travel] }) }, { translateY: counter.interpolate({ inputRange: [0, 1], outputRange: [height * 0.03, -height * 0.02] }) }] }]}>
        <Svg width={width + travel * 2} height={height + travel * 2} style={{ position: 'absolute', left: -travel, top: -travel }}>
          <Defs>{glow('gOlive', olive, dark ? 0.45 : 0.4)}</Defs>
          <Ellipse cx={travel + width * 0.85} cy={travel + height * 0.92} rx={width * 0.7} ry={width * 0.55} fill="url(#gOlive)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
