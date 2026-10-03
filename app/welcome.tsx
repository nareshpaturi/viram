import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { RhythmStep } from '../src/breathing/rhythm';
import { AppText } from '../src/components/AppText';
import { BrandMark } from '../src/components/BrandMark';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { RhythmOrb } from '../src/components/RhythmOrb';
import { Screen } from '../src/components/Screen';
import { COMFORT_LINE, WELLNESS_LINE } from '../src/content/safety';
import { LightProvider, useEverydayWash } from '../src/light/light';
import { Halo, Wash } from '../src/light/Wash';
import { WASHES, WELCOME_HALO } from '../src/light/washes';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { colors, spacing } from '../src/theme';

/** The orb shows an even four-step breath; it stays still. */
const EVEN_BREATH: RhythmStep[] = [
  { kind: 'inhale', seconds: 4 },
  { kind: 'hold', seconds: 4 },
  { kind: 'exhale', seconds: 4 },
  { kind: 'rest', seconds: 4 },
];
/** How far the orb bleeds past the screen's right edge, beyond the 24 inset. */
const ORB_RIGHT = -(spacing.lg + 32);
/** The orb starts just under the status bar, above the screen's 24 inset. */
const ORB_TOP = 1 - spacing.lg;

/** Only a quick action or a shared link may continue past first use. */
function safeNext(next: string | undefined): Href {
  if (next && (next.startsWith('/practice?') || next.startsWith('/r/'))) return next as Href;
  return '/';
}

/**
 * First use (FR-13): one screen with the comfort guidance and wellness
 * disclaimer. No permission prompt, cue setup, or account. Soft Light: the
 * hour's wash with a large rhythm orb at the top; at large text sizes the
 * orb shrinks and everything scrolls.
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
  const orb = fontScale > 1.3 ? 180 : 284;
  const halo = Math.round((orb * 420) / 284);

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
      <View style={{ height: ORB_TOP + orb - 2 }}>
        <Halo
          stops={WELCOME_HALO[wash]}
          size={halo}
          style={[styles.absolute, { right: ORB_RIGHT - (halo - orb) / 2, top: ORB_TOP - (halo - orb) / 2 }]}
        />
        <RhythmOrb steps={EVEN_BREATH} size={orb} style={[styles.absolute, { right: ORB_RIGHT, top: ORB_TOP }]} />
        <View style={styles.brand}>
          <BrandMark size={44} />
          <AppText variant="bodyStrong" style={styles.wordmark}>
            Viram
          </AppText>
        </View>
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
  absolute: { position: 'absolute' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, marginTop: -9 },
  wordmark: { fontSize: 20, lineHeight: 24, color: colors.pine },
  hero: { fontSize: 40, lineHeight: 46, letterSpacing: -0.6 },
  lead: { marginTop: 14, fontSize: 17, lineHeight: 25, color: colors.inkSoftOnWash },
  card: { marginTop: spacing.lg, padding: 18 },
  cueNote: { textAlign: 'center', color: colors.inkSoftOnWash, marginBottom: 6 },
});
