import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/** 24 px grid, 1.7 px rounded strokes, no fills (brand guide, “Icons”). */
type IconName = 'breathe' | 'practices' | 'history' | 'settings';

const PATHS: Record<IconName, React.ReactNode> = {
  // A wave in a circle, echoing the mark.
  breathe: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M6.5 12.5c1.4-2 2.8-2 4.2 0s2.8 2 4.2 0 2.2-1.4 2.6-.8" />
    </>
  ),
  practices: (
    <>
      <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5z" />
      <Path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </>
  ),
  history: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  settings: (
    <>
      <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <Circle cx={15} cy={7} r={2} />
      <Circle cx={9} cy={17} r={2} />
    </>
  ),
};

export function Icon({ name, color, size = 24 }: { name: IconName; color: ColorValue; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  );
}
