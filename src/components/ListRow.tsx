import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, touchTarget } from '../theme';
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
}

/** A tappable row: title, supporting lines, trailing value, and a chevron. */
export function ListRow({ title, subtitle, detail, trailing, onPress, accessibilityHint, accessibilityLabel, children, danger }: Props) {
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

/** Rows grouped on one surface with hairline separators. */
export function RowGroup({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={styles.groupWrap}>
      {title ? (
        <AppText variant="overline" accessibilityRole="header">
          {title.toUpperCase()}
        </AppText>
      ) : null}
      <View style={styles.group}>{children}</View>
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
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  text: { flex: 1, gap: 2 },
  trailing: { color: colors.inkSoft },
  chevron: { color: colors.inkFaint, fontSize: 22 },
  groupWrap: { gap: spacing.sm },
  group: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.divider },
});
