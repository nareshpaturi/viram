import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Chevron } from './Chevron';

interface Props {
  /** The saved style: “Breath circle” or “Illustrated guide”. */
  value: string;
  onPress: () => void;
  /** White on paper (the Guidance sheet), or a light veil on the pine practice surface (Pause). */
  tone?: 'paper' | 'pine';
}

/** Opens the Visual guide chooser, showing the saved style. */
export function VisualGuideRow({ value, onPress, tone = 'paper' }: Props) {
  const pine = tone === 'pine';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Visual guide, ${value}`}
      accessibilityHint="Choose how practice shows your breath"
      style={({ pressed }) => [styles.row, pine ? styles.pine : styles.paper, pressed && styles.pressed]}
    >
      <View style={styles.words}>
        <AppText variant="bodyStrong" style={pine && styles.pineTitle}>
          Visual guide
        </AppText>
        <AppText variant="label" style={pine && styles.pineValue}>
          {value}
        </AppText>
      </View>
      <Chevron color={pine ? colors.practiceText : colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: 18, borderWidth: 1 },
  paper: { backgroundColor: colors.surface, borderColor: colors.divider },
  pine: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.16)' },
  words: { flex: 1 },
  pineTitle: { color: colors.practiceText },
  pineValue: { color: colors.practiceTextMuted },
  pressed: { opacity: 0.8 },
});
