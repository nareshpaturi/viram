import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { describeRhythm, describeTargetAndPlan } from '../../src/breathing/describe';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { COMFORT_LINE } from '../../src/content/safety';
import { STORE_URL } from '../../src/legal/links';
import { practiceHref } from '../../src/practice/launch';
import type { Practice } from '../../src/practice/practice';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { decodeShareLink, findTechnique } from '../../src/sharing/link';
import { stores } from '../../src/storage';
import { colors } from '../../src/theme';

/**
 * A received link (FR-11). Validated on device; nothing is saved or started
 * on its own. The sender's name is labeled as theirs, and every instruction
 * and safety note comes from the installed library.
 */
export default function IncomingLink() {
  const { payload } = useLocalSearchParams<{ payload: string }>();
  const { preferences, update } = usePreferences();
  const [saved, setSaved] = useState<string | null>(null);

  if (!preferences.firstUseComplete) {
    return <Redirect href={{ pathname: '/welcome', params: { next: `/r/${payload ?? ''}` } }} />;
  }

  const result = decodeShareLink(payload);
  if (!result.ok) {
    return (
      <Screen edges={['left', 'right']} footer={
        <>
          <Button title="Go to Practices" onPress={() => router.replace('/practices')} />
          <Button title="Check for an update" variant="secondary" onPress={() => Linking.openURL(STORE_URL).catch(() => undefined)} />
        </>
      }>
        <AppText variant="hero" accessibilityRole="header">
          This link can’t be opened.
        </AppText>
        <AppText>It may be incomplete, or made with a newer version of Viram. Nothing was saved.</AppText>
      </Screen>
    );
  }

  const { rhythm } = result;
  const technique = rhythm.techniqueId ? findTechnique(rhythm.techniqueId) : undefined;
  const practice: Practice = {
    source: technique ? { kind: 'technique', id: technique.id } : { kind: 'custom' },
    name: rhythm.name,
    techniqueId: rhythm.techniqueId,
    steps: rhythm.steps,
    target: rhythm.target,
  };

  const save = () => {
    const outcome = stores().rhythms.save({ ...rhythm, origin: 'link' });
    if (outcome.ok) setSaved('Saved to My rhythms.');
    else if (outcome.reason === 'duplicate') setSaved(`Already in My rhythms as “${outcome.existing?.name}”.`);
    else if (outcome.reason === 'limit') setSaved('You have 20 saved rhythms. Delete one in My rhythms to save this.');
    else setSaved('This rhythm couldn’t be saved.');
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button
            title="Begin"
            onPress={() => {
              update({ lastPractice: practice });
              router.replace(practiceHref(practice));
            }}
          />
          <Button title="Save to My rhythms" variant="secondary" onPress={save} disabled={saved !== null} />
        </>
      }
    >
      <View>
        <AppText variant="title" accessibilityRole="header">
          {rhythm.name}
        </AppText>
        <AppText variant="label">Name chosen by the person who shared it</AppText>
      </View>
      <Card>
        {technique ? (
          <AppText variant="bodyStrong">
            Based on {technique.name} · {technique.subtitle.toLowerCase()}
          </AppText>
        ) : (
          <AppText variant="bodyStrong">Custom rhythm</AppText>
        )}
        <AppText>{describeRhythm(rhythm.steps).replace(/^./, (c) => c.toUpperCase())}</AppText>
        <AppText variant="label">
          {describeTargetAndPlan(rhythm.steps, rhythm.target)}
        </AppText>
      </Card>
      {technique ? (
        <Card muted>
          <AppText>
            <AppText variant="bodyStrong">Take care: </AppText>
            {technique.guidance.takeCareShort}
          </AppText>
          <Button
            title={`Read the ${technique.name} guide`}
            variant="quiet"
            onPress={() => router.push({ pathname: '/technique/[id]', params: { id: technique.id } })}
          />
        </Card>
      ) : (
        <Card muted>
          <AppText>{COMFORT_LINE}</AppText>
        </Card>
      )}
      <AppText variant="label">Viram uses its own instructions and safety notes for shared rhythms. A link can’t add text, pictures, or other links.</AppText>
      {saved ? (
        <AppText accessibilityRole="alert" style={styles.saved}>
          {saved}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  saved: { color: colors.pine },
});
