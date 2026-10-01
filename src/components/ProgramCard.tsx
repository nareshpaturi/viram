import { Pressable, StyleSheet, View } from 'react-native';
import { Wash } from '../light/Wash';
import { PROGRAM_LIGHT, WASHES } from '../light/washes';
import { colors, fonts, radius, shadows, spacing } from '../theme';
import { AppText } from './AppText';
import { SessionDots } from './SessionDots';

interface Props {
  eyebrow: string;
  name: string;
  summary: string;
  minutes: number;
  /** Its own light; programs without one take the day wash. */
  programId: string;
  sessions: { total: number; done: number } | null;
  onPress: () => void;
}

/**
 * A program in Practices (Soft Light): a 286 px card in its own light. It
 * grows taller at large text sizes rather than clipping.
 */
export function ProgramCard({ eyebrow, name, summary, minutes, programId, sessions, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${eyebrow}. ${summary} About ${minutes} minutes in total.`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Wash wash={PROGRAM_LIGHT[programId] ?? WASHES.day} />
      <AppText variant="overline" style={styles.eyebrow}>
        {eyebrow.toUpperCase()}
      </AppText>
      <AppText variant="heading" style={styles.name}>
        {name}
      </AppText>
      <AppText style={styles.summary}>{summary}</AppText>
      <View style={styles.footer}>
        {sessions ? <SessionDots total={sessions.total} done={sessions.done} label={`${sessions.done} of ${sessions.total} sessions complete.`} /> : null}
        <AppText variant="label">About {minutes} min</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 286,
    minHeight: 168,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.glassRim,
    boxShadow: shadows.card,
    padding: 18,
    gap: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  eyebrow: { fontSize: 12, lineHeight: 16 },
  name: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 27 },
  summary: { fontSize: 14, lineHeight: 20 },
  footer: { marginTop: 'auto', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
});
