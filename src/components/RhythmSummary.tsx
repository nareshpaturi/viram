import { StyleSheet, View } from 'react-native';
import { describePace, describePlan, describeSlowing, describeTarget, guidedPace, rhythmLine, speakRhythm } from '../breathing/describe';
import { planFor, type RhythmStep, type Slowing, type Target } from '../breathing/rhythm';
import { colors, fonts, spacing } from '../theme';
import { AppText } from './AppText';
import { RhythmStrip } from './RhythmStrip';

interface Props {
  steps: readonly RhythmStep[];
  target: Target;
  slowing?: Slowing | null;
}

const SIDE_WORD = { inhale: 'IN', exhale: 'OUT', hold: 'HOLD', rest: 'REST' } as const;

/**
 * A rhythm on the page, without a card or its name (UX08): “In 4 · Out 6,
 * each side” with the length at the right, the strip, which side each bar
 * is, then rounds, time, and guided pace.
 */
export function RhythmSummary({ steps, target, slowing = null }: Props) {
  const plan = planFor(steps, target, slowing);
  return (
    <View style={styles.summary}>
      <View style={styles.header}>
        <AppText variant="bodyStrong" style={styles.rhythm} accessibilityLabel={speakRhythm(steps)}>
          {rhythmLine(steps)}
        </AppText>
        <AppText variant="bodyStrong" style={styles.target}>
          {describeTarget(target)}
        </AppText>
      </View>
      <RhythmStrip steps={steps} />
      {steps.some((s) => s.side) ? (
        // Alternate-nostril rhythms: which side each bar is.
        <View style={styles.sides} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {steps
            .filter((s) => s.seconds > 0)
            .map((s, i) => (
              <AppText key={i} variant="label" style={[styles.side, { flexGrow: s.seconds }]} numberOfLines={1}>
                {`${SIDE_WORD[s.kind]} ${s.side?.toUpperCase() ?? ''}`.trim()}
              </AppText>
            ))}
        </View>
      ) : null}
      {slowing ? <AppText variant="label">{describeSlowing(steps, slowing)}, a little each round.</AppText> : null}
      <AppText variant="label">
        {describePlan(steps, target, slowing)} · {guidedPace(describePace(plan))}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 10 },
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: spacing.sm },
  rhythm: { fontSize: 17, flexShrink: 1 },
  target: { color: colors.pine },
  sides: { flexDirection: 'row', gap: 3, marginTop: -4 },
  side: { flexBasis: 0, fontFamily: fonts.sansSemibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
});
