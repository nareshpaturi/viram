import { StyleSheet, View } from 'react-native';
import { describePace, describePlan, describeRhythm, describeSlowing, describeTarget, speakRhythm } from '../breathing/describe';
import { planFor, type RhythmStep, type Slowing, type Target } from '../breathing/rhythm';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { RhythmStrip } from './RhythmStrip';

interface Props {
  name: string;
  subtitle?: string | null;
  steps: readonly RhythmStep[];
  target: Target;
  slowing?: Slowing | null;
  /** Accessible hint for Sanskrit names: the pronunciation respelling. */
  nameHint?: string;
}

/** Name, target, rhythm, planned rounds and duration, and guided pace. */
export function RhythmCard({ name, subtitle, steps, target, slowing = null, nameHint }: Props) {
  const plan = planFor(steps, target, slowing);
  const rhythm = describeRhythm(steps);
  const seconds = /^\d/.test(rhythm) ? `${rhythm} sec` : rhythm;
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.names}>
          <AppText variant="heading" accessibilityHint={nameHint}>
            {name}
          </AppText>
          {subtitle ? <AppText variant="label">{subtitle}</AppText> : null}
        </View>
        <AppText variant="bodyStrong" style={styles.target}>
          {describeTarget(target)}
        </AppText>
      </View>
      <RhythmStrip steps={steps} />
      <AppText accessibilityLabel={speakRhythm(steps)}>{seconds.charAt(0).toUpperCase() + seconds.slice(1)}</AppText>
      {slowing ? <AppText variant="label">{describeSlowing(steps, slowing)}, a little each round.</AppText> : null}
      <AppText variant="label">
        {describePlan(steps, target, slowing)} practice · guided {describePace(plan)} breaths/min
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  names: { flexShrink: 1, gap: 2 },
  target: { color: colors.pine },
});
