import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RhythmStep } from '../breathing/rhythm';
import { useSvgId, Wash } from '../light/Wash';
import { PLATE } from '../light/washes';
import { colors, spacing } from '../theme';
import { RhythmOrb } from './RhythmOrb';

/** Space for the floating back button above the title. */
export const PLATE_TOP = 66;

/**
 * The technique guide's header in Soft Light: day light, the practice's
 * rhythm orb bleeding off the right edge, and a soft curved edge into
 * paper. The text column keeps clear of the orb and grows at large text.
 */
export function TechniquePlate({ steps, children }: { steps: readonly RhythmStep[]; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const haloId = useSvgId('plateHalo');
  return (
    <View style={[styles.plate, { paddingTop: insets.top + PLATE_TOP }]}>
      <Wash wash={PLATE} />
      <View style={[styles.orb, { top: insets.top + 40 }]} pointerEvents="none">
        <Svg width={300} height={300} style={styles.halo}>
          <Defs>
            <RadialGradient id={haloId} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.65} />
              <Stop offset="0.68" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={150} r={150} fill={`url(#${haloId})`} />
        </Svg>
        <RhythmOrb steps={steps} size={236} />
      </View>
      <View style={styles.text}>{children}</View>
      <Svg width={width} height={40} viewBox="0 0 390 40" preserveAspectRatio="none" style={styles.edge} pointerEvents="none">
        <Path d="M0 22C70 6 140 0 205 10s125 26 185 8V40H0z" fill={colors.paper} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    marginHorizontal: -spacing.lg,
    // Bleeds to the top and sides past the screen's 24 px inset.
    marginTop: -spacing.lg,
    marginBottom: -spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
    minHeight: 340,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', right: -74, width: 236, height: 236 },
  halo: { position: 'absolute', left: -32, top: -32 },
  text: { width: '62%', gap: 4 },
  edge: { position: 'absolute', left: 0, bottom: -1 },
});
