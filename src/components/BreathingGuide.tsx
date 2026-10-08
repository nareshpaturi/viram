import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import type { StepKind } from '../breathing/rhythm';
import { useSvgId } from '../light/Wash';
import { useSurface } from '../night/surface';
import { colors } from '../theme';
import { AppText } from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SMALL = 0.56;
const FULL = 1;
/** The step's glow behind the guide (Soft Light, “Practice glow”). */
const GLOW = 640;

/** Guide size across a step: inhale expands, hold is full, exhale contracts, rest is small. */
function scaleAt(kind: StepKind, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  if (kind === 'inhale') return SMALL + (FULL - SMALL) * p;
  if (kind === 'exhale') return FULL - (FULL - SMALL) * p;
  return kind === 'hold' ? FULL : SMALL;
}

/** Lit discs: a highlight up and to the left, the phase color, a deeper edge. */
const LIT: Record<StepKind, [string, string, string]> = {
  inhale: ['#D6EAEA', '#A8CFD0', '#94C1C3'],
  hold: ['#F3DB98', '#E4B84A', '#D6A838'],
  exhale: ['#F2A189', '#E46F51', '#D8603F'],
  rest: ['#FFFFFF', '#EEF4EF', '#DCE7DF'],
};

/** Mixes a hex color toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const out = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - a) + target * a));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

interface Props {
  kind: StepKind;
  hum: boolean;
  /** Changes on every new step instance, so the animation re-syncs to the clock. */
  stepKey: string;
  durationMs: number;
  elapsedMs: number;
  /** The number shown (seconds left, or the spoken count); null shows the step ring (half-second rhythms). */
  count: number | null;
  frozen: boolean;
  reducedMotion: boolean;
  size: number;
  /** 0–1 through the practice, shown on the outer ring; omitted hides it. */
  progress?: number;
  /** The count's size, smaller in a Visual guide preview; practice uses the 64/72 countdown. */
  numeral?: number;
}

/**
 * The circular guide. The clock stays authoritative: each step starts an
 * animation from the clock's position to the step's end, on the native
 * driver, with one gentle ease and no overshoot. Reduced motion keeps a
 * fixed-size guide with the count, labels, and cues.
 *
 * Soft Light: the disc is lit, the step's color glows softly behind it, and
 * the outer ring traces the session. The glow and ring follow the same
 * clock-driven renders; nothing here keeps its own time. Night practice
 * dims the disc and halves the glow.
 */
export function BreathingGuide({ kind, hum, stepKey, durationMs, elapsedMs, count, frozen, reducedMotion, size, progress, numeral }: Props) {
  const surface = useSurface();
  const id = useSvgId('guide');
  const scale = useRef(new Animated.Value(scaleAt(kind, elapsedMs / durationMs))).current;
  const ring = useRef(new Animated.Value(elapsedMs / durationMs)).current;
  const showRing = count === null && !reducedMotion;
  const outer = size / 2 - 1.5;
  const stepRadius = size / 2 - 10;
  const circumference = 2 * Math.PI * stepRadius;

  useEffect(() => {
    const p = durationMs > 0 ? elapsedMs / durationMs : 1;
    const remaining = Math.max(0, durationMs - elapsedMs);
    scale.setValue(reducedMotion ? 0.8 : scaleAt(kind, p));
    ring.setValue(p);
    if (frozen || reducedMotion || remaining === 0) return;
    // Moving within the cue's first syllable, then settling slowly, like a breath filling or emptying.
    // An ease-in-out stood still for the first half second, so the guide seemed to lag the voice.
    const easing = Easing.bezier(0.25, 0.1, 0.25, 1);
    const animations = [Animated.timing(scale, { toValue: scaleAt(kind, 1), duration: remaining, easing, useNativeDriver: true })];
    if (showRing) animations.push(Animated.timing(ring, { toValue: 1, duration: remaining, easing: Easing.linear, useNativeDriver: false }));
    const running = Animated.parallel(animations);
    running.start();
    return () => running.stop();
    // Re-sync only on a new step or a pause change; elapsed is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, frozen, reducedMotion]);

  // Whole points: a fractional SVG size clips the disc's edge flat.
  const disc = Math.round(size * 0.78);
  const lit = surface.night ? ([shade(surface.phase[kind], 0.2), surface.phase[kind], shade(surface.phase[kind], -0.1)] as const) : LIT[kind];
  const glowColor = surface.night ? surface.phase[kind] : LIT[kind][1];
  const glowScale = surface.night ? 0.5 : 1;
  // The session arc runs clockwise from the top; its head carries a coral point.
  const p = Math.min(0.9999, Math.max(0, progress ?? 0));
  const angle = p * 2 * Math.PI;
  // The ring's canvas has room around it, so the coral point is never cut off at 12 o'clock.
  const mid = size / 2 + RING_ROOM;
  const head = { x: mid + outer * Math.sin(angle), y: mid - outer * Math.cos(angle) };
  const arc = `M ${mid} ${mid - outer} A ${outer} ${outer} 0 ${p > 0.5 ? 1 : 0} 1 ${head.x} ${head.y}`;

  return (
    <View style={{ width: size, height: size + (hum ? 28 : 0), alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.center, { width: size, height: size }]}>
        <Svg width={GLOW} height={GLOW} style={[styles.glow, { left: (size - GLOW) / 2, top: (size - GLOW) / 2 }]}>
          <Defs>
            <RadialGradient id={`${id}glow`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={glowColor} stopOpacity={0.4 * glowScale} />
              <Stop offset="0.38" stopColor={glowColor} stopOpacity={0.13 * glowScale} />
              <Stop offset="0.62" stopColor={glowColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill={`url(#${id}glow)`} />
        </Svg>
        <Svg width={size + RING_ROOM * 2} height={size + RING_ROOM * 2} style={[styles.ring, { left: -RING_ROOM, top: -RING_ROOM }]}>
          <Circle cx={mid} cy={mid} r={outer} stroke={surface.line} strokeWidth={1} fill="none" />
          {progress !== undefined && p > 0 ? (
            <>
              <Path d={arc} stroke="rgba(255,255,255,0.75)" strokeWidth={2.5} strokeLinecap="round" fill="none" />
              <Circle cx={head.x} cy={head.y} r={5} fill={colors.coral} stroke={surface.night ? surface.background : colors.pine} strokeWidth={2} />
            </>
          ) : null}
        </Svg>
        <Animated.View style={{ position: 'absolute', width: disc, height: disc, transform: [{ scale }] }}>
          <Svg width={disc} height={disc}>
            <Defs>
              <RadialGradient id={`${id}disc`} cx="0.36" cy="0.3" r="0.75" fx="0.36" fy="0.3">
                <Stop offset="0" stopColor={lit[0]} />
                <Stop offset="0.55" stopColor={lit[1]} />
                <Stop offset="1" stopColor={lit[2]} />
              </RadialGradient>
            </Defs>
            <Circle cx={disc / 2} cy={disc / 2} r={disc / 2} fill={`url(#${id}disc)`} />
          </Svg>
        </Animated.View>
        {showRing ? (
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={stepRadius}
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
        {count !== null ? (
          <AppText variant="countdown" maxFontSizeMultiplier={1.4} style={[{ color: surface.count }, numeral ? { fontSize: numeral, lineHeight: numeral * 1.125 } : null]}>
            {count}
          </AppText>
        ) : null}
      </View>
      {hum ? <HumWave color={surface.hum} /> : null}
    </View>
  );
}

/** Coral, under the exhale guide, for Bhramari's Hum and Udgeeth's Om. */
function HumWave({ color }: { color: string }) {
  return (
    <Svg width={96} height={20} viewBox="0 0 96 20">
      <Path d="M4 10c6-8 10-8 16 0s10 8 16 0 10-8 16 0 10 8 16 0 10-8 16 0" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Room around the ring's canvas for the coral point (radius 5, plus its border). */
const RING_ROOM = 8;

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
});
