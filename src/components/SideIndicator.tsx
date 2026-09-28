import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Line } from 'react-native-svg';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

/**
 * Which nostril is open, from the practitioner's point of view. Filled means
 * open; a crossed outline means closed. The step label and voice also name
 * the side, so this is never the only cue.
 */
export function SideIndicator({ open }: { open: 'left' | 'right' }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {(['left', 'right'] as const).map((side) => (
        <View key={side} style={styles.side}>
          <Svg width={28} height={36} viewBox="0 0 28 36">
            <Ellipse
              cx={14}
              cy={18}
              rx={10}
              ry={14}
              fill={side === open ? colors.practiceText : 'none'}
              stroke={colors.practiceText}
              strokeWidth={2}
            />
            {side !== open ? <Line x1={5} y1={29} x2={23} y2={7} stroke={colors.practiceText} strokeWidth={2} /> : null}
          </Svg>
          <AppText variant="label" style={styles.label}>
            {side === 'left' ? 'Left' : 'Right'}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xl, justifyContent: 'center' },
  side: { alignItems: 'center', gap: spacing.xs },
  label: { color: colors.practiceTextMuted },
});
