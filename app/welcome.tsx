import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { AppText } from '../src/components/AppText';
import { BrandMark } from '../src/components/BrandMark';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { WelcomeAura } from '../src/components/WelcomeAura';
import { COMFORT_LINE, WELLNESS_LINE } from '../src/content/safety';
import { LightProvider, useEverydayWash } from '../src/light/light';
import { Wash } from '../src/light/Wash';
import { WASHES } from '../src/light/washes';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { colors, spacing } from '../src/theme';

/** The aura, centered under the brand row; the hero starts just below it. */
const AURA = 270;
/** At large text sizes it shrinks and moves below the brand row. */
const AURA_LARGE = 180;

/** Only a quick action or a shared link may continue past first use. */
function safeNext(next: string | undefined): Href {
  if (next && (next.startsWith('/practice?') || next.startsWith('/r/'))) return next as Href;
  return '/';
}

/**
 * First use (FR-13): one screen with the comfort guidance and wellness
 * disclaimer. No permission prompt, cue setup, or account. Soft Light: the
 * hour's wash with the breath aura at the top; at large text sizes the
 * aura shrinks and everything scrolls.
 */
export default function Welcome() {
  const wash = useEverydayWash();
  return (
    <LightProvider wash={wash}>
      <WelcomeScreen wash={wash} />
    </LightProvider>
  );
}

function WelcomeScreen({ wash }: { wash: ReturnType<typeof useEverydayWash> }) {
  const { update } = usePreferences();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.3;

  const onContinue = () => {
    update({ firstUseComplete: true });
    router.replace(safeNext(next));
  };

  return (
    <Screen
      background={<Wash wash={WASHES[wash]} />}
      footer={
        <>
          <AppText variant="label" style={styles.cueNote}>
            Voice guidance and haptic taps are on. Change them anytime.
          </AppText>
          <Button title="Continue" onPress={onContinue} />
        </>
      }
    >
      {/* The aura sits behind the brand row, as on the board; at large text it follows it instead. */}
      <View style={large ? styles.stacked : { height: AURA - 5 }}>
        {large ? null : <WelcomeAura size={AURA} style={styles.aura} />}
        <View style={styles.brand}>
          <BrandMark size={44} />
          <AppText variant="bodyStrong" style={styles.wordmark}>
            Viram
          </AppText>
        </View>
        {large ? <WelcomeAura size={AURA_LARGE} /> : null}
      </View>
      <View>
        <AppText variant="hero" accessibilityRole="header" style={styles.hero}>
          Steady breath.{'\n'}Steady mind.
        </AppText>
        <AppText style={styles.lead}>Pranayama, guided at your pace. Free, and ready offline.</AppText>
        <Card style={styles.card}>
          <AppText variant="heading">Stay comfortable</AppText>
          <AppText>{COMFORT_LINE}</AppText>
          <AppText variant="label">{WELLNESS_LINE}</AppText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Centered on the screen, its top 24 below the status bar.
  aura: { position: 'absolute', top: 0, alignSelf: 'center' },
  stacked: { alignItems: 'center', gap: spacing.ms },
  brand: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.ms, marginTop: -9 },
  wordmark: { fontSize: 20, lineHeight: 24, color: colors.pine },
  hero: { fontSize: 40, lineHeight: 46, letterSpacing: -0.6 },
  lead: { marginTop: 14, fontSize: 17, lineHeight: 25, color: colors.inkSoftOnWash },
  card: { marginTop: 22, padding: 18 },
  cueNote: { textAlign: 'center', color: colors.inkSoftOnWash, marginBottom: 6 },
});
