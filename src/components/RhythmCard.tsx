import { StyleSheet, View } from 'react-native';
import { describeRhythm, describePlan, describeTarget, speakRhythm } from '../breathing/describe';
import { formatPace, planFor, type RhythmStep, type Target } from '../breathing/rhythm';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { RhythmStrip } from './RhythmStrip';

interface Props {
  name: string;
  subtitle?: string | null;
  steps: readonly RhythmStep[];
  target: Target;
  /** Accessible hint for Sanskrit names: the pronunciation respelling. */
  nameHint?: string;
}

/** Name, target, rhythm, planned rounds and duration, and guided pace. */
export function RhythmCard({ name, subtitle, steps, target, nameHint }: Props) {
  const plan = planFor(steps, target);
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
      <AppText variant="label">
        {describePlan(steps, target)} practice · guided {formatPace(plan.breathsPerMinute)} breaths/min
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  names: { flexShrink: 1, gap: 2 },
  target: { color: colors.pine },
});
