import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { useSvgId } from '../light/Wash';
import { colors } from '../theme';

/** White core, then saffron, coral, and sky, fading out at the edge. The same on every wash. */
const AURA = [
  { offset: 0, color: '#FFFFFF', opacity: 0.95 },
  { offset: 0.28, color: '#FFFFFF', opacity: 0.7 },
  { offset: 0.42, color: '#E4B84A', opacity: 0.45 },
  { offset: 0.58, color: '#E46F51', opacity: 0.38 },
  { offset: 0.78, color: '#A8CFD0', opacity: 0.5 },
  { offset: 1, color: '#A8CFD0', opacity: 0 },
];
const RINGS = [
  { r: 72, opacity: 0.75 },
  { r: 96, opacity: 0.55 },
  { r: 120, opacity: 0.35 },
];

/**
 * Welcome's aura: a four-color glow with three soft rings and a single-line
 * nose at its center, because pranayama begins with the breath through the
 * nose (docs/branding-design.html, “Line diagrams”). Decorative and still.
 */
export function WelcomeAura({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const id = useSvgId('aura');
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 300 300">
        <Defs>
          <RadialGradient id={id} cx="150" cy="150" r="140" fx="150" fy="150" gradientUnits="userSpaceOnUse">
            {AURA.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx="150" cy="150" r="140" fill={`url(#${id})`} />
        {RINGS.map(({ r, opacity }) => (
          <Circle key={r} cx="150" cy="150" r={r} fill="none" stroke="#FFFFFF" strokeOpacity={opacity} strokeWidth={1.4} />
        ))}
        <G
          transform="translate(150 150) scale(1.14) translate(-150 -142)"
          fill="none"
          stroke={colors.pine}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M146 98C146 122 144 142 139 158" />
          <Path d="M131 160C119 164 117 180 129 183C135 184.5 139 181 144 183.5C147.5 185.5 152.5 185.5 156 183.5C161 181 165 184.5 171 183C183 180 181 164 169 160" />
        </G>
      </Svg>
    </View>
  );
}
