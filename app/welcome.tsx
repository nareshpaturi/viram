import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { AppText } from '../src/components/AppText';
import { BrandMark } from '../src/components/BrandMark';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { COMFORT_LINE, WELLNESS_LINE } from '../src/content/safety';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { colors, spacing } from '../src/theme';

/** Only a quick action or a shared link may continue past first use. */
function safeNext(next: string | undefined): Href {
  if (next && (next.startsWith('/practice?') || next.startsWith('/r/'))) return next as Href;
  return '/';
}

/**
 * First use (FR-13): one screen with the comfort guidance and wellness
 * disclaimer. No permission prompt, cue setup, or account.
 */
export default function Welcome() {
  const { update } = usePreferences();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const onContinue = () => {
    update({ firstUseComplete: true });
    router.replace(safeNext(next));
  };

  return (
    <Screen edges={['top', 'left', 'right']} footer={<Button title="Continue" onPress={onContinue} />}>
      <View style={styles.brand}>
        <BrandMark size={44} />
        <AppText variant="bodyStrong" style={styles.wordmark}>
          Viram
        </AppText>
      </View>
      <AppText variant="hero" accessibilityRole="header">
        Steady breath.{'\n'}Steady mind.
      </AppText>
      <AppText style={styles.lead}>Pranayama, guided at your pace. Free, and ready offline.</AppText>
      <Card muted>
        <AppText variant="heading">Stay comfortable</AppText>
        <AppText>{COMFORT_LINE}</AppText>
        <AppText variant="label">{WELLNESS_LINE}</AppText>
      </Card>
      <AppText variant="label">Voice guidance and haptic taps are on. Change them anytime.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, marginTop: spacing.lg, marginBottom: spacing.lg },
  wordmark: { fontSize: 20, color: colors.pine },
  lead: { color: colors.inkSoft },
});
