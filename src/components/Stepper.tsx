import { useEffect, useRef } from 'react';
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
 * only the out-of-range action is disabled. Holding − or + repeats, so a
 * long range (1–60 minutes, 1–108 rounds) is a hold away, not dozens of taps.
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

/** The first repeat waits for a deliberate hold; repeats then quicken a little. */
const REPEAT_DELAY_MS = 450;
const REPEAT_MS = [160, 160, 160, 110, 110, 110, 80];

function StepButton({ symbol, onPress, disabled }: { symbol: string; onPress: () => void; disabled: boolean }) {
  const glass = useGlass();
  // The repeat calls the latest handler, which sees the value the last repeat set.
  const latest = useRef(onPress);
  latest.current = onPress;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const repeat = (count: number) => {
    latest.current();
    timer.current = setTimeout(() => repeat(count + 1), REPEAT_MS[Math.min(count, REPEAT_MS.length - 1)]);
  };
  useEffect(() => stop, []);
  // Reaching the end of the range disables the button and ends the hold.
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => repeat(0)}
      delayLongPress={REPEAT_DELAY_MS}
      onPressOut={stop}
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
