import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useGlass } from '../light/light';
import { colors, shadows, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

interface Props {
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  /** Trailing text such as “5 min”. */
  trailing?: string | null;
  onPress?: () => void;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  children?: ReactNode;
  danger?: boolean;
  /** A 44 px rhythm orb or icon before the text; decorative. */
  leading?: ReactNode;
}

/** A tappable row: title, supporting lines, trailing value, and a chevron. */
export function ListRow({ title, subtitle, detail, trailing, onPress, accessibilityHint, accessibilityLabel, children, danger, leading }: Props) {
  const label = accessibilityLabel ?? [title, subtitle, detail, trailing].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <View style={styles.text}>
        <AppText variant="bodyStrong" style={danger && { color: colors.danger }}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="label">{subtitle}</AppText> : null}
        {detail ? <AppText variant="label">{detail}</AppText> : null}
        {children}
      </View>
      {trailing ? <AppText variant="label" style={styles.trailing}>{trailing}</AppText> : null}
      {onPress ? <AppText variant="control" style={styles.chevron} importantForAccessibility="no">›</AppText> : null}
    </Pressable>
  );
}

/** Rows grouped on one frosted card with hairline separators (Soft Light). */
export function RowGroup({ children, title }: { children: ReactNode; title?: string }) {
  const glass = useGlass();
  return (
    <View style={styles.groupWrap}>
      {title ? (
        <AppText variant="overline" accessibilityRole="header">
          {title.toUpperCase()}
        </AppText>
      ) : null}
      <View style={[styles.group, { backgroundColor: glass.fill, borderColor: glass.rim }]}>
        {/* Pulls the last row's divider under the clipped edge. */}
        <View style={styles.lastDivider}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pressed: { backgroundColor: 'rgba(238, 244, 239, 0.8)' },
  text: { flex: 1, gap: 2 },
  trailing: { color: colors.inkSoft },
  chevron: { color: colors.inkFaint, fontSize: 22 },
  groupWrap: { gap: spacing.sm },
  lastDivider: { marginBottom: -StyleSheet.hairlineWidth },
  group: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, boxShadow: shadows.card },
});
