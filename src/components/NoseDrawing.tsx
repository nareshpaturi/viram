import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import type { RhythmStep } from '../breathing/rhythm';
import { useSvgId } from '../light/Wash';
import { useSurface } from '../night/surface';
import { airAt, airFor, arrowHead, curvePath, linePath, point, segment, slashFor, tangent } from '../practice/noseAir';

/** Welcome's nose: the bridge, then the base with both nostrils. */
const BRIDGE = 'M146 98C146 122 144 142 139 158';
const BASE = 'M131 160C119 164 117 180 129 183C135 184.5 139 181 144 183.5C147.5 185.5 152.5 185.5 156 183.5C161 181 165 184.5 171 183C183 180 181 164 169 160';
/** Closed lips, and the hum's waves either side. */
const LIPS = 'M136 212C143 216 157 216 164 212';
const WAVES = 'M124 202C119 208 119 216 124 222M116 196C109 205 109 219 116 228M176 202C181 208 181 216 176 222M184 196C191 205 191 219 184 228';

/**
 * Line weights and placement for each use of the 300 viewBox:
 * - compact: 120 pt above the breath circle, with a still arrow.
 * - full: the illustrated guide at 300 pt, with the air moving.
 * - preview: the illustrated guide on a chooser card's 176 pt stage.
 * - thumb: the Visual guide chooser's 84 pt thumbnail, with a still arrow.
 */
const LOOK = {
  compact: { nose: 5, slash: 5.5, air: 6, faint: 0, still: true },
  full: { nose: 1.8, slash: 2.1, air: 2.6, faint: 2.4, still: false },
  preview: { nose: 2.4, slash: 2.8, air: 3.2, faint: 3, still: false },
  thumb: { nose: 6, slash: 6.5, air: 7, faint: 0, still: true },
} as const;
const LARGE = 'translate(150 135) scale(1.45) translate(-150 -142)';

interface Props {
  step: RhythmStep;
  look: keyof typeof LOOK;
  size: number;
  /** 0–1 through the step, from the session clock (or a preview's). */
  progress: number;
  reducedMotion: boolean;
}

/**
 * The nose in mirror view, the same paths as the Welcome aura: a slash over
 * the closed nostril, air into the open one on inhale and out on exhale, or
 * closed lips and waves for a hum. Drawn above the breath circle, as the
 * illustrated guide, and in the Visual guide chooser. Decorative: the step
 * label and voice always say the same.
 */
export function NoseDrawing({ step, look, size, progress, reducedMotion }: Props) {
  const surface = useSurface();
  const id = useSvgId('nose');
  const weights = LOOK[look];
  const hum = step.cue === 'hum';
  const large = look === 'full' || look === 'preview';
  const transform = large
    ? LARGE
    : look === 'thumb'
      ? 'translate(150 140) scale(1.25) translate(-150 -177)'
      : `translate(150 150) scale(1.15) translate(-150 ${hum ? -163 : -177})`;
  // Air goes through the open side, or both sides when neither is closed (A
  // only). A hum's waves already show the breath leaving, so it draws no air.
  const airSides: ('left' | 'right')[] = hum ? [] : step.side ? [step.side] : large ? ['left', 'right'] : [];
  const air = airAt(step.kind, progress, weights.still || reducedMotion);
  const airColor = surface.phase[step.kind];
  const ink = surface.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 300 300" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {large ? (
        <>
          <Defs>
            <RadialGradient id={`${id}core`} cx="150" cy="170" r="120" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={surface.night ? 0.05 : 0.1} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={170} r={120} fill={`url(#${id}core)`} />
        </>
      ) : null}
      <G transform={transform} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d={BRIDGE} stroke={ink} strokeOpacity={0.92} strokeWidth={weights.nose} />
        <Path d={BASE} stroke={ink} strokeOpacity={0.92} strokeWidth={weights.nose} />
        {step.side ? <Path d={linePath(slashFor(step.side))} stroke={ink} strokeWidth={weights.slash} /> : null}
        {hum ? (
          <>
            <Path d={LIPS} stroke={ink} strokeOpacity={0.92} strokeWidth={weights.nose} />
            <Path d={WAVES} stroke={surface.hum} strokeWidth={weights.nose} />
          </>
        ) : null}
        {air
          ? airSides.map((side) => {
              const curve = airFor(side);
              const travel = tangent(curve, air.head);
              const direction = air.inward ? travel : { x: -travel.x, y: -travel.y };
              return (
                <G key={side}>
                  {weights.faint > 0 && !reducedMotion ? (
                    <Path d={curvePath(curve)} stroke={airColor} strokeOpacity={0.35} strokeWidth={weights.faint} />
                  ) : null}
                  <Path d={curvePath(segment(curve, air.from, air.to))} stroke={airColor} strokeWidth={weights.air} />
                  <Path d={arrowHead(point(curve, air.head), direction)} stroke={airColor} strokeWidth={weights.air} />
                </G>
              );
            })
          : null}
      </G>
    </Svg>
  );
}
