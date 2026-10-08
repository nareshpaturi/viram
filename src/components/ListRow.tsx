import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Frosted, useGlass } from '../light/light';
import { colors, shadows, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';
import { Chevron } from './Chevron';

/** Rows on a white card sit a little roomier, with mist dividers (UX02). */
const White = createContext(false);

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
  const white = useContext(White);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, white && styles.whiteRow, pressed && styles.pressed]}
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
      {onPress ? <Chevron color={colors.inkFaint} /> : null}
    </Pressable>
  );
}

/**
 * Rows grouped on one card with hairline separators: frosted over a wash
 * (Soft Light), or white over paper, as in Practices (UX02).
 */
export function RowGroup({ children, title, tone = 'frosted' }: { children: ReactNode; title?: string; tone?: 'frosted' | 'white' }) {
  const glass = useGlass();
  return (
    <View style={styles.groupWrap}>
      {title ? (
        <AppText variant="overline" accessibilityRole="header">
          {title.toUpperCase()}
        </AppText>
      ) : null}
      <View style={[styles.group, tone === 'white' ? styles.white : { backgroundColor: glass.fill, borderColor: glass.rim }]}>
        {/* Pulls the last row's divider under the clipped edge. */}
        <View style={tone === 'white' ? styles.lastWhiteDivider : styles.lastDivider}>
          <White.Provider value={tone === 'white'}>
            <Frosted>{children}</Frosted>
          </White.Provider>
        </View>
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
  whiteRow: { minHeight: 64, gap: 14, paddingVertical: 10, paddingLeft: spacing.md, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: colors.mist },
  pressed: { backgroundColor: 'rgba(238, 244, 239, 0.8)' },
  text: { flex: 1, gap: 2 },
  trailing: { color: colors.inkSoft },
  groupWrap: { gap: spacing.sm },
  lastDivider: { marginBottom: -StyleSheet.hairlineWidth },
  lastWhiteDivider: { marginBottom: -1 },
  group: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, boxShadow: shadows.card },
  white: { borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.surface, boxShadow: '0px 6px 18px rgba(18, 55, 47, 0.06)' },
});
