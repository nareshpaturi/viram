import { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';
import { angleLine, type Glow, type Wash as WashSpec } from './washes';

/** SVG ids must be plain; React's ids contain colons. */
export const useSvgId = (prefix: string) => `${prefix}${useId().replace(/[^A-Za-z0-9]/g, '')}`;

interface Props {
  wash: WashSpec;
  /** Extra glows drawn over the wash, e.g. completion's bloom. */
  extra?: Glow[];
  /** Fade the wash into paper between these distances from the top, in px. */
  fadeToPaper?: { from: number; to: number };
  style?: ViewStyle;
}

function GlowGradient({ id, glow }: { id: string; glow: Glow }) {
  return (
    <RadialGradient id={id} cx={glow.cx} cy={glow.cy} rx={glow.rx} ry={glow.ry} fx={glow.cx} fy={glow.cy} gradientUnits="objectBoundingBox">
      {glow.stops.map((s, i) => (
        <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
      ))}
    </RadialGradient>
  );
}

/**
 * Soft Light: a full-bleed wash behind a screen's content. Decorative and
 * hidden from accessibility; it never moves.
 */
export function Wash({ wash, extra = [], fadeToPaper, style }: Props) {
  const id = useSvgId('wash');
  const line = angleLine(wash.angle);
  const glows = [...wash.glows, ...extra];
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`${id}base`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} gradientUnits="objectBoundingBox">
            {wash.base.map((s, i) => (
              <Stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
          {glows.map((g, i) => (
            <GlowGradient key={i} id={`${id}g${i}`} glow={g} />
          ))}
          {fadeToPaper ? (
            <LinearGradient id={`${id}fade`} x1={0} y1={fadeToPaper.from} x2={0} y2={fadeToPaper.to} gradientUnits="userSpaceOnUse">
              <Stop offset={0} stopColor={colors.paper} stopOpacity={0} />
              <Stop offset={1} stopColor={colors.paper} stopOpacity={1} />
            </LinearGradient>
          ) : null}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}base)`} />
        {glows.map((_, i) => (
          <Rect key={i} x="0" y="0" width="100%" height="100%" fill={`url(#${id}g${i})`} />
        ))}
        {fadeToPaper ? <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}fade)`} /> : null}
      </Svg>
    </View>
  );
}
