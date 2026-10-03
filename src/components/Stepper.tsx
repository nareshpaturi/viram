import { Pressable, StyleSheet, View } from 'react-native';
import { useGlass } from '../light/light';
import { colors, radius, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  /** What the value reads as, e.g. “4s”, “Off”, “21”. */
  display: string;
  /** Spoken value, e.g. “4 seconds”, “Off”. */
  spoken: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
  hint?: string;
}

/**
 * − value + with 48 pt targets. Screen readers get one adjustable control;
 * only the out-of-range action is disabled.
 */
export function Stepper({ label, display, spoken, onDecrement, onIncrement, canDecrement, canIncrement, hint }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: spoken }}
      accessibilityHint={hint}
      accessibilityActions={[
        { name: 'increment', label: `More ${label}` },
        { name: 'decrement', label: `Less ${label}` },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrement) onIncrement();
        if (event.nativeEvent.actionName === 'decrement' && canDecrement) onDecrement();
      }}
    >
      <AppText variant="bodyStrong" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.controls}>
        <StepButton symbol="−" onPress={onDecrement} disabled={!canDecrement} />
        <AppText variant="control" style={styles.value}>
          {display}
        </AppText>
        <StepButton symbol="+" onPress={onIncrement} disabled={!canIncrement} />
      </View>
    </View>
  );
}

function StepButton({ symbol, onPress, disabled }: { symbol: string; onPress: () => void; disabled: boolean }) {
  const glass = useGlass();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={({ pressed }) => [styles.button, { backgroundColor: glass.fill, borderColor: glass.outline }, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <AppText variant="control" style={styles.symbol}>
        {symbol}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  label: { flexShrink: 1, minWidth: 120 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 22, lineHeight: 26, color: colors.pine },
  value: { minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.35 },
});
