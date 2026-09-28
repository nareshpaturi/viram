import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * The two-breaths mark (brand guide, “Identity”): two arcs on a circle of
 * radius 28 at (50, 52), 28° gaps, a coral point in the top gap, on pine.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect width={100} height={100} rx={22} fill={colors.pine} />
      <Path d="M36.85 27.28A28 28 0 0 0 36.85 76.72" stroke={colors.sky} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M63.15 27.28A28 28 0 0 1 63.15 76.72" stroke={colors.mist} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Circle cx={50} cy={27.3} r={4.6} fill={colors.coral} />
    </Svg>
  );
}
