import { StyleSheet, View } from 'react-native';
import type { RhythmStep } from '../breathing/rhythm';
import { phaseColors, radius } from '../theme';

/** 8 px bars, 3 px gaps, widths proportional to seconds. Decorative: always paired with the numbers. */
export function RhythmStrip({ steps }: { steps: readonly RhythmStep[] }) {
  return (
    <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {steps
        .map((step, i) => ({ step, i }))
        .filter(({ step }) => step.seconds > 0)
        .map(({ step, i }) => (
          <View key={i} style={[styles.bar, { flexGrow: step.seconds, backgroundColor: phaseColors[step.kind] }]} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 3, height: 8 },
  bar: { flexBasis: 0, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(18,55,47,0.18)' },
});
