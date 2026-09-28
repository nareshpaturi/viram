import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { StepKind } from '../breathing/rhythm';
import { useSurface } from '../night/surface';
import { AppText } from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SMALL = 0.56;
const FULL = 1;

/** Guide size across a step: inhale expands, hold is full, exhale contracts, rest is small. */
function scaleAt(kind: StepKind, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  if (kind === 'inhale') return SMALL + (FULL - SMALL) * p;
  if (kind === 'exhale') return FULL - (FULL - SMALL) * p;
  return kind === 'hold' ? FULL : SMALL;
}

interface Props {
  kind: StepKind;
  hum: boolean;
  /** Changes on every new step instance, so the animation re-syncs to the clock. */
  stepKey: string;
  durationMs: number;
  elapsedMs: number;
  /** Whole seconds left; null shows the progress ring (half-second rhythms). */
  secondsLeft: number | null;
  frozen: boolean;
  reducedMotion: boolean;
  size: number;
}

/**
 * The circular guide. The clock stays authoritative: each step starts an
 * animation from the clock's position to the step's end, on the native
 * driver, with one gentle ease and no overshoot. Reduced motion keeps a
 * fixed-size guide with the count, labels, and cues.
 */
export function BreathingGuide({ kind, hum, stepKey, durationMs, elapsedMs, secondsLeft, frozen, reducedMotion, size }: Props) {
  const surface = useSurface();
  const scale = useRef(new Animated.Value(scaleAt(kind, elapsedMs / durationMs))).current;
  const ring = useRef(new Animated.Value(elapsedMs / durationMs)).current;
  const showRing = secondsLeft === null && !reducedMotion;
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const progress = durationMs > 0 ? elapsedMs / durationMs : 1;
    const remaining = Math.max(0, durationMs - elapsedMs);
    scale.setValue(reducedMotion ? 0.8 : scaleAt(kind, progress));
    ring.setValue(progress);
    if (frozen || reducedMotion || remaining === 0) return;
    const easing = Easing.inOut(Easing.sin);
    const animations = [Animated.timing(scale, { toValue: scaleAt(kind, 1), duration: remaining, easing, useNativeDriver: true })];
    if (showRing) animations.push(Animated.timing(ring, { toValue: 1, duration: remaining, easing: Easing.linear, useNativeDriver: false }));
    const running = Animated.parallel(animations);
    running.start();
    return () => running.stop();
    // Re-sync only on a new step or a pause change; elapsed is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, frozen, reducedMotion]);

  const disc = size * 0.78;
  return (
    <View style={{ width: size, height: size + (hum ? 28 : 0), alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.center, { width: size, height: size }]}>
        <View style={[styles.outline, { width: size, height: size, borderRadius: size / 2, borderColor: surface.line }]} />
        <Animated.View
          style={{
            position: 'absolute',
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            backgroundColor: surface.phase[kind],
            transform: [{ scale }],
          }}
        />
        {showRing ? (
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={surface.ring}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        ) : null}
        {secondsLeft !== null ? (
          <AppText variant="countdown" maxFontSizeMultiplier={1.4} style={{ color: surface.count }}>
            {secondsLeft}
          </AppText>
        ) : null}
      </View>
      {hum ? <HumWave color={surface.hum} /> : null}
    </View>
  );
}

/** Coral, under the exhale guide, only for Bhramari's Hum. */
function HumWave({ color }: { color: string }) {
  return (
    <Svg width={96} height={20} viewBox="0 0 96 20">
      <Path d="M4 10c6-8 10-8 16 0s10 8 16 0 10-8 16 0 10 8 16 0 10-8 16 0" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  outline: { position: 'absolute', borderWidth: 1 },
});
