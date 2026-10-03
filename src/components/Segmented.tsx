import { Pressable, StyleSheet, View } from 'react-native';
import { useGlass } from '../light/light';
import { colors, radius, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

interface Option<T extends string | number> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

interface Props<T extends string | number> {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Chips wrap onto new lines; the default is one row of equal segments. */
  wrap?: boolean;
  onPine?: boolean;
}

/** A single choice among a few options, announced as a radio group. */
export function Segmented<T extends string | number>({ label, options, value, onChange, wrap, onPine }: Props<T>) {
  const glass = useGlass();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.group, wrap && styles.wrap]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: glass.fill, borderColor: glass.outline },
              wrap ? styles.chip : styles.segment,
              onPine && styles.onPine,
              selected && (onPine ? styles.selectedOnPine : styles.selected),
              pressed && styles.pressed,
            ]}
          >
            <AppText
              variant="control"
              style={[styles.text, onPine && { color: colors.practiceText }, selected && { color: onPine ? colors.pine : colors.white }]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
  option: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: { flex: 1, paddingHorizontal: spacing.sm },
  chip: {},
  onPine: { backgroundColor: 'transparent', borderColor: colors.practiceLine },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectedOnPine: { backgroundColor: colors.practiceText, borderColor: colors.practiceText },
  pressed: { opacity: 0.8 },
  text: { textAlign: 'center' },
});
