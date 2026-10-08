import { Pressable, StyleSheet } from 'react-native';
import type { Target } from '../breathing/rhythm';
import { durationChoice } from '../practice/durationOptions';
import { subtitleOf, type Practice } from '../practice/practice';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Chevron } from './Chevron';
import { RadioCard, RadioRow } from './RadioCard';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  practice: Practice;
  /** Applies at once; there's no Done. */
  onChoose: (target: Target) => void;
  /** “Adjust rhythm or use rounds”: any other length, or rounds instead of minutes. */
  onAdjust: () => void;
  onClose: () => void;
}

/**
 * Breathe's Duration sheet (UX07): a few lengths, each with how long it
 * really runs, or the rounds a practice is taught in. A tap applies and
 * closes.
 */
export function DurationSheet({ visible, practice, onChoose, onAdjust, onClose }: Props) {
  const choice = durationChoice(practice);
  return (
    <Sheet visible={visible} title="Duration" subtitle={[practice.name, subtitleOf(practice)].filter(Boolean).join(' · ')} dismiss="close" onClose={onClose}>
      <AppText variant="bodyStrong" style={styles.question}>
        {choice.question}
      </AppText>
      <RadioCard label="Duration">
        {choice.options.map((option, i) => (
          <RadioRow
            key={`${option.label}|${option.detail}`}
            label={option.label}
            detail={option.detail}
            selected={option.selected}
            last={i === choice.options.length - 1}
            onPress={() => onChoose(option.target)}
          />
        ))}
      </RadioCard>
      <AppText variant="label">{choice.note}</AppText>
      <Pressable onPress={onAdjust} accessibilityRole="button" style={({ pressed }) => [styles.adjust, pressed && styles.pressed]}>
        <AppText variant="control" style={styles.adjustText}>
          Adjust rhythm or use rounds
        </AppText>
        <Chevron />
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 17, lineHeight: 24, marginTop: spacing.xs },
  adjust: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6 },
  adjustText: { color: colors.pine },
  pressed: { opacity: 0.7 },
});
