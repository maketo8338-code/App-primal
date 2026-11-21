import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { useTheme } from '../lib/theme';

export default function PrimalAtmosphere() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const drift = useRef(new Animated.Value(0)).current;
  const counterDrift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 26000, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 26000, useNativeDriver: true }),
    ]));
    const counterLoop = Animated.loop(Animated.sequence([
      Animated.timing(counterDrift, { toValue: 1, duration: 34000, useNativeDriver: true }),
      Animated.timing(counterDrift, { toValue: 0, duration: 34000, useNativeDriver: true }),
    ]));
    const shimmerLoop = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 15000, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 15000, useNativeDriver: true }),
    ]));
    driftLoop.start();
    counterLoop.start();
    shimmerLoop.start();
    return () => {
      driftLoop.stop();
      counterLoop.stop();
      shimmerLoop.stop();
    };
  }, [counterDrift, drift, shimmer]);

  const dark = theme.mode === 'dark';
  const travel = Math.max(56, width * 0.16);
  const driftX = drift.interpolate({ inputRange: [0, 1], outputRange: [-travel, travel] });
  const driftY = drift.interpolate({ inputRange: [0, 1], outputRange: [height * 0.035, -height * 0.025] });
  const counterX = counterDrift.interpolate({ inputRange: [0, 1], outputRange: [travel, -travel] });
  const counterY = counterDrift.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.02, height * 0.03] });
  const lightOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [dark ? 0.12 : 0.2, dark ? 0.28 : 0.42] });
  const svgWidth = width * 1.5;
  const svgHeight = height * 1.18;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={dark ? ['#041226', '#082B45', '#063B4A', '#061A31'] : ['#D9F5F8', '#A9E7EC', '#E7F5FF', '#C7EDF2']}
        locations={[0, 0.34, 0.7, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.layer, { opacity: 0.96, transform: [{ translateX: driftX }, { translateY: driftY }, { rotate: '-3deg' }] }]}>
        <Svg width={svgWidth} height={svgHeight} viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <SvgLinearGradient id="deepWave" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={dark ? '#071A3A' : '#87D6E1'} stopOpacity="0.92" />
              <Stop offset="0.52" stopColor={dark ? '#0A5570' : '#39B9C7'} stopOpacity="0.54" />
              <Stop offset="1" stopColor={dark ? '#123C76' : '#BDEFF1'} stopOpacity="0.3" />
            </SvgLinearGradient>
            <SvgLinearGradient id="aquaWave" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={dark ? '#1AC6C5' : '#40C9D2'} stopOpacity="0.34" />
              <Stop offset="0.5" stopColor={dark ? '#0D718A' : '#8DE5E5'} stopOpacity="0.24" />
              <Stop offset="1" stopColor={dark ? '#0A335B' : '#D9F9F6'} stopOpacity="0.06" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M-70 130 C 25 35, 88 62, 162 126 S 286 210, 470 92 L470 470 C 348 548, 284 478, 190 420 S 46 364,-70 468 Z" fill="url(#deepWave)" />
          <Path d="M-70 420 C 44 312, 112 382, 202 448 S 340 574, 470 458 L470 760 C 347 830, 273 704, 178 654 S 36 620,-70 722 Z" fill="url(#aquaWave)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: 0.9, transform: [{ translateX: counterX }, { translateY: counterY }, { rotate: '5deg' }] }]}>
        <Svg width={svgWidth} height={svgHeight} viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <SvgLinearGradient id="midWave" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={dark ? '#0A284E' : '#C2F1F1'} stopOpacity="0.16" />
              <Stop offset="0.55" stopColor={dark ? '#167B91' : '#5CCDD3'} stopOpacity="0.3" />
              <Stop offset="1" stopColor={dark ? '#55D7D2' : '#E8FFFF'} stopOpacity="0.12" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M-80 300 C 25 190, 106 244, 188 306 S 330 390, 480 270 L480 570 C 354 660, 290 548, 190 508 S 36 472,-80 590 Z" fill="url(#midWave)" />
          <Path d="M-80 690 C 42 580, 112 642, 220 706 S 358 770, 480 680 L480 980 L-80 980 Z" fill="url(#midWave)" opacity="0.62" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: lightOpacity, transform: [{ translateX: counterX }, { translateY: driftY }, { rotate: '-8deg' }] }]}>
        <Svg width={svgWidth} height={svgHeight} viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice">
          <Path d="M-80 84 C 64 12, 118 110, 214 126 S 356 128, 480 44 L480 168 C 355 250, 286 218, 190 198 S 42 178,-80 238 Z" fill={dark ? '#8BFFFF' : '#FFFFFF'} fillOpacity="0.48" />
          <Path d="M-80 520 C 56 444, 130 526, 222 548 S 362 532, 480 462 L480 534 C 358 622, 286 596, 184 578 S 42 568,-80 626 Z" fill={dark ? '#62E9DF' : '#FFFFFF'} fillOpacity="0.3" />
          <Ellipse cx="310" cy="170" rx="108" ry="72" fill={dark ? '#4FE4E0' : '#FFFFFF'} fillOpacity="0.1" />
          <Ellipse cx="54" cy="780" rx="150" ry="94" fill={dark ? '#1764A0' : '#6AD7E1'} fillOpacity="0.12" />
        </Svg>
      </Animated.View>
      <View style={[styles.tint, { backgroundColor: dark ? '#031124' : '#D8F5F8', opacity: dark ? 0.08 : 0.12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  tint: { ...StyleSheet.absoluteFillObject },
});
