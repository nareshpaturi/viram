import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RhythmStep } from '../breathing/rhythm';
import { Halo, Wash } from '../light/Wash';
import { PLATE } from '../light/washes';
import { colors, spacing } from '../theme';
import { RhythmOrb } from './RhythmOrb';

const PLATE_HALO = [
  { offset: 0, color: '#FFFFFF', opacity: 0.65 },
  { offset: 0.68, color: '#FFFFFF', opacity: 0 },
];

/** Space for the floating back button above the title. */
export const PLATE_TOP = 66;

/** The orb's size, and how far it bleeds off the right edge (UX08). */
const ORB = 140;
const BLEED = 12;

/**
 * The technique guide's header in Soft Light: day light, the practice's
 * rhythm orb bleeding off the right edge, and a soft curved edge into
 * paper. 270 tall on a 47 pt status bar; the text column keeps clear of the
 * orb and grows at large text.
 */
export function TechniquePlate({ steps, children }: { steps: readonly RhythmStep[]; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.plate, { paddingTop: insets.top + PLATE_TOP, minHeight: insets.top + 223 }]}>
      <Wash wash={PLATE} />
      <View style={[styles.orb, { top: insets.top + 23 }]} pointerEvents="none">
        <Halo stops={PLATE_HALO} size={ORB + 40} style={styles.halo} />
        <RhythmOrb steps={steps} size={ORB} />
      </View>
      <View style={[styles.text, { width: width - spacing.lg - (ORB - BLEED) - 2 }]}>{children}</View>
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
    overflow: 'hidden',
  },
  orb: { position: 'absolute', right: -BLEED, width: ORB, height: ORB },
  halo: { position: 'absolute', left: -20, top: -20 },
  text: { gap: 4 },
  edge: { position: 'absolute', left: 0, bottom: -1 },
});
