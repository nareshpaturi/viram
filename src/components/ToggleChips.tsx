import { Pressable, StyleSheet, View } from 'react-native';
import { useGlass } from '../light/light';
import { colors, radius, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

interface Option<K extends string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  label: string;
  options: readonly Option<K>[];
  value: Record<K, boolean>;
  onChange: (value: Record<K, boolean>) => void;
}

/**
 * Several independent choices as chips, each announced as a checkbox; the
 * look matches Segmented's chips. At least one stays on: turning off the
 * last one is ignored (an empty set reads as a broken setting).
 */
export function ToggleChips<K extends string>({ label, options, value, onChange }: Props<K>) {
  const glass = useGlass();
  const onCount = options.filter((o) => value[o.key]).length;
  return (
    <View accessibilityLabel={label} style={styles.group}>
      {options.map((option) => {
        const checked = value[option.key];
        const locked = checked && onCount === 1;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: locked }}
            accessibilityLabel={`${label}: ${option.label}`}
            disabled={locked}
            onPress={() => onChange({ ...value, [option.key]: !checked })}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: glass.fill, borderColor: glass.outline },
              checked && styles.checked,
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="control" style={checked ? styles.checkedText : undefined}>
              {checked ? `✓ ${option.label}` : option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkedText: { color: colors.white },
  pressed: { opacity: 0.8 },
});
