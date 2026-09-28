import { useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { describeRhythm, describeTarget } from '../src/breathing/describe';
import { AppText } from '../src/components/AppText';
import { BrandMark } from '../src/components/BrandMark';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { parsePractice } from '../src/practice/practice';
import { encodeShareLink, validateRhythm } from '../src/sharing/link';
import { colors, radius, spacing } from '../src/theme';

/**
 * Share preview (FR-11): shows exactly what the link contains before the
 * system share sheet. Viram never sees who it goes to.
 */
export default function SharePreview() {
  const params = useLocalSearchParams<{ practice?: string }>();
  const [copied, setCopied] = useState(false);
  const rhythm = useMemo(() => {
    try {
      const practice = params.practice ? parsePractice(JSON.parse(params.practice)) : null;
      return practice && validateRhythm({ name: practice.name, steps: practice.steps, target: practice.target, techniqueId: practice.techniqueId });
    } catch {
      return null;
    }
  }, [params.practice]);

  if (!rhythm) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">This practice can’t be shared.</AppText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const link = encodeShareLink(rhythm);
  const share = () =>
    Share.share(Platform.OS === 'ios' ? { url: link, message: `${rhythm.name} on Viram` } : { message: `${rhythm.name} on Viram: ${link}` }).catch(() => undefined);
  const copy = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    AccessibilityInfo.announceForAccessibility('Link copied');
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button title="Share link…" onPress={share} />
          <Button title={copied ? 'Link copied' : 'Copy link'} variant="secondary" onPress={copy} />
        </>
      }
    >
      <AppText variant="title" accessibilityRole="header">
        Share this practice
      </AppText>
      <View style={styles.card} accessible accessibilityLabel={`Link preview: ${rhythm.name}, ${describeTarget(rhythm.target)}, ${describeRhythm(rhythm.steps)}`}>
        <View style={styles.cardHeader}>
          <BrandMark size={28} />
          <AppText variant="label" style={styles.onPineMuted}>
            Viram
          </AppText>
        </View>
        <AppText variant="heading" style={styles.onPine}>
          {rhythm.name} · {describeTarget(rhythm.target)}
        </AppText>
        <AppText style={styles.onPine}>{describeRhythm(rhythm.steps).replace(/^./, (c) => c.toUpperCase())}</AppText>
        <AppText variant="label" style={styles.onPineMuted}>
          viram.app/r/…
        </AppText>
      </View>
      <AppText>The link carries the name, rhythm, and length. Instructions and safety notes always come from the app.</AppText>
      <AppText variant="label">Anyone with the link can see this. Viram doesn’t see who you share with.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.pine, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  onPine: { color: colors.practiceText },
  onPineMuted: { color: colors.practiceTextMuted },
});
