import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, RadialGradient, Stop } from 'react-native-svg';
import type { RhythmStep, StepKind } from '../breathing/rhythm';
import { useSvgId } from '../light/Wash';

/** Where each step kind's light sits, and how it fades (Soft Light, “Rhythm orb”). */
const BLOBS: Record<StepKind, { x: number; y: number; color: string; stops: [number, number] }> = {
  inhale: { x: 58, y: 100, color: '#A8CFD0', stops: [1, 0.75] },
  hold: { x: 100, y: 58, color: '#E4B84A', stops: [0.95, 0.68] },
  exhale: { x: 142, y: 100, color: '#E46F51', stops: [0.9, 0.62] },
  rest: { x: 100, y: 142, color: '#FFFFFF', stops: [0.95, 0.6] },
};
/** Drawn back to front, so the warm exhale reads over the cool inhale. */
const ORDER: StepKind[] = ['rest', 'inhale', 'hold', 'exhale'];

/** Each kind's share of a round, by seconds. Pure, for tests. */
export function orbShares(steps: readonly RhythmStep[]): Partial<Record<StepKind, number>> {
  const total = steps.reduce((sum, s) => sum + s.seconds, 0);
  const shares: Partial<Record<StepKind, number>> = {};
  if (total <= 0) return shares;
  for (const s of steps) if (s.seconds > 0) shares[s.kind] = (shares[s.kind] ?? 0) + s.seconds / total;
  return shares;
}

/** A blob's radius in the 200-unit view: larger for a bigger share of the round. */
export const orbRadius = (share: number) => Math.round(96 * (0.5 + 0.75 * share));

/**
 * A practice's circle, lit by its own rhythm: sky, saffron, coral, and white
 * glows sized by the seconds in each step. Sides add a split; Hum and Om
 * add ripples. Decorative and hidden from screen readers: the numbers
 * always accompany it.
 */
export function RhythmOrb({ steps, size, style }: { steps: readonly RhythmStep[]; size: number; style?: ViewStyle }) {
  const id = useSvgId('orb');
  const shares = orbShares(steps);
  const sided = steps.some((s) => s.side);
  const voiced = steps.some((s) => s.cue === 'hum' || s.cue === 'om');
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id={`${id}base`} cx="0.4" cy="0.35" r="0.75">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#EEF4EF" />
          </RadialGradient>
          {ORDER.map((kind) => (
            <RadialGradient key={kind} id={`${id}${kind}`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={BLOBS[kind].color} stopOpacity={BLOBS[kind].stops[0]} />
              <Stop offset="0.45" stopColor={BLOBS[kind].color} stopOpacity={BLOBS[kind].stops[1]} />
              <Stop offset="1" stopColor={BLOBS[kind].color} stopOpacity={0} />
            </RadialGradient>
          ))}
          <RadialGradient id={`${id}hi`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.7} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <ClipPath id={`${id}clip`}>
            <Circle cx="100" cy="100" r="96" />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id}clip)`}>
          <Circle cx="100" cy="100" r="96" fill={`url(#${id}base)`} />
          {ORDER.filter((kind) => shares[kind]).map((kind) => (
            <Circle key={kind} cx={BLOBS[kind].x} cy={BLOBS[kind].y} r={orbRadius(shares[kind]!)} fill={`url(#${id}${kind})`} />
          ))}
          <Circle cx="80" cy="70" r="46" fill={`url(#${id}hi)`} />
          {sided ? <Line x1="100" y1="6" x2="100" y2="194" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={size < 80 ? 7 : 3} /> : null}
          {voiced
            ? [22, 40, 58].map((r, i) => (
                <Circle key={r} cx="142" cy="100" r={r} fill="none" stroke="#FFFFFF" strokeOpacity={[0.7, 0.5, 0.3][i]} strokeWidth={size < 80 ? 5 : 3} />
              ))
            : null}
        </G>
        <Circle cx="100" cy="100" r="95.5" fill="none" stroke="rgba(18,55,47,0.10)" strokeWidth={1} />
      </Svg>
    </View>
  );
}
