import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

/** The “opens something” mark after a link or row; decorative. */
export function Chevron({ color = colors.pine, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}
