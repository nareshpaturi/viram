import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Frosted } from '../light/light';
import { colors, radius, shadows, spacing } from '../theme';
import { AppText } from './AppText';

/** A white card of choices, one per row, announced as a radio group (UX07, UX10). */
export function RadioCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.card}>
      {/* The shadow sits on the outer view; the inner one clips the selected fill to the corners. */}
      <View style={styles.clip}>
        <Frosted>{children}</Frosted>
      </View>
    </View>
  );
}

interface RowProps {
  label: string;
  /** A second line: how long it runs, or “Playing sample”. */
  detail?: string | null;
  selected: boolean;
  onPress: () => void;
  /** Where the radio ring sits: before the label (lists you browse) or after it (a sheet's choices). */
  ring?: 'leading' | 'trailing';
  /** A control beside the row, e.g. a play button; it stays its own element for screen readers. */
  accessory?: ReactNode;
  last?: boolean;
  accessibilityLabel?: string;
}

/** One choice: the selected row takes a mist fill and a filled ring. */
export function RadioRow({ label, detail, selected, onPress, ring = 'trailing', accessory, last, accessibilityLabel }: RowProps) {
  const dot = (
    <View style={[styles.ring, { borderColor: selected ? colors.pine : colors.inkFaint }]}>
      {selected ? <View style={styles.dot} /> : null}
    </View>
  );
  return (
    <View style={[styles.row, selected && styles.selected, !last && styles.divider]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected, checked: selected }}
        accessibilityLabel={accessibilityLabel ?? [label, detail].filter(Boolean).join(', ')}
        style={({ pressed }) => [styles.choice, ring === 'leading' ? styles.leading : styles.trailing, pressed && styles.pressed]}
      >
        {ring === 'leading' ? dot : null}
        <View style={styles.words}>
          <AppText variant="bodyStrong">{label}</AppText>
          {detail ? (
            <AppText variant="label" style={ring === 'leading' ? styles.status : undefined}>
              {detail}
            </AppText>
          ) : null}
        </View>
        {ring === 'trailing' ? dot : null}
      </Pressable>
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, backgroundColor: colors.surface, boxShadow: shadows.card },
  clip: { borderRadius: radius.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.mist },
  selected: { backgroundColor: colors.mist },
  choice: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingVertical: 10, paddingLeft: spacing.md },
  leading: { minHeight: 56 },
  trailing: { paddingRight: spacing.sm },
  words: { flex: 1 },
  status: { color: colors.pine },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pine },
  pressed: { opacity: 0.8 },
});
