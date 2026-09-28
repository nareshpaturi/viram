import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { PLACEHOLDER_VOICE } from '../../src/audio/manifest.generated';
import { AppText } from '../../src/components/AppText';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { Screen } from '../../src/components/Screen';
import { PRIVACY_URL, STORE_URL, SUPPORT_URL } from '../../src/legal/links';
import { colors, spacing } from '../../src/theme';

/** About (FR-22): the free-core promise, content sources, and the AI-voice disclosure. */
export default function About() {
  const version = Constants.expoConfig?.version ?? '1.0';
  return (
    <Screen edges={['left', 'right']}>
      <AppText variant="hero" accessibilityRole="header">
        Free, always.
      </AppText>
      <AppText>
        Every breathing practice, custom rhythms, voice, tone, and haptic guidance, and your history are free. No ads, no account. Anything added later
        will never lock these.
      </AppText>
      <Section title="Practice content">
        Written for Viram from classical texts and published research. Each practice lists its sources. An instructor’s name appears on a practice only
        after they have reviewed it.
      </Section>
      <Section title="Voice">
        {PLACEHOLDER_VOICE
          ? 'Voice guidance is AI-generated from Viram’s scripts. This build uses placeholder clips; the final voice is checked for pronunciation before release.'
          : 'Voice guidance is AI-generated from Viram’s scripts and checked for pronunciation before release.'}
      </Section>
      <RowGroup title="Sources">
        <ListRow title="Books and classical texts" onPress={() => router.push({ pathname: '/settings/sources', params: { group: 'teaching' } })} />
        <ListRow title="Published studies" onPress={() => router.push({ pathname: '/settings/sources', params: { group: 'studies' } })} />
      </RowGroup>
      <RowGroup>
        <ListRow title="Rate Viram" subtitle="Opens the store page" onPress={() => Linking.openURL(STORE_URL).catch(() => undefined)} />
      </RowGroup>
      <View style={styles.footer}>
        <AppText variant="label">Viram {version}</AppText>
        <AppText variant="label" style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL).catch(() => undefined)}>
          Privacy policy
        </AppText>
        <AppText variant="label" style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(SUPPORT_URL).catch(() => undefined)}>
          Support
        </AppText>
      </View>
      <AppText variant="label">Typefaces: Newsreader and DM Sans, under the SIL Open Font License.</AppText>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  link: { color: colors.pine, textDecorationLine: 'underline', minHeight: 44, textAlignVertical: 'center' },
});
