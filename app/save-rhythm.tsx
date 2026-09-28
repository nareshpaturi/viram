import { useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { describeRhythm, describeTargetAndPlan } from '../src/breathing/describe';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { parsePractice } from '../src/practice/practice';
import { MAX_RHYTHMS, type RhythmOrigin } from '../src/rhythms/repository';
import { MAX_NAME_LENGTH, cleanName } from '../src/sharing/link';
import { stores } from '../src/storage';
import { colors, radius, spacing, textStyles, touchTarget } from '../src/theme';

/**
 * Save or rename a rhythm (FR-10). Names are plain text, 1–40 characters.
 * At 20 saved rhythms nothing is overwritten: saving explains the limit.
 */
export default function SaveRhythm() {
  const params = useLocalSearchParams<{ practice?: string; rename?: string; from?: string }>();
  const renaming = params.rename ? stores().rhythms.get(params.rename) : null;
  const practice = useMemo(() => {
    if (renaming) return null;
    try {
      return params.practice ? parsePractice(JSON.parse(params.practice)) : null;
    } catch {
      return null;
    }
  }, [params.practice, renaming]);
  const subject = renaming ?? practice;
  const [name, setName] = useState(renaming?.name ?? (practice && practice.source.kind !== 'custom' ? practice.name : ''));
  const [problem, setProblem] = useState<string | null>(null);
  const atLimit = !renaming && stores().rhythms.count() >= MAX_RHYTHMS;

  if (!subject) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">There’s no rhythm to save.</AppText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const valid = cleanName(name) !== null;

  const save = () => {
    if (renaming) {
      if (!stores().rhythms.rename(renaming.id, name)) return setProblem('Use plain text, up to 40 characters.');
      AccessibilityInfo.announceForAccessibility('Renamed');
      return router.back();
    }
    const origin: RhythmOrigin = params.from === 'link' ? 'link' : practice?.source.kind === 'custom' ? 'custom' : 'adjusted';
    const result = stores().rhythms.save({ name, steps: subject.steps, target: subject.target, techniqueId: subject.techniqueId, origin });
    if (result.ok) {
      AccessibilityInfo.announceForAccessibility('Saved to My rhythms');
      return router.back();
    }
    if (result.reason === 'duplicate') setProblem(`You already saved this rhythm as “${result.existing?.name}”.`);
    else if (result.reason === 'limit') setProblem('You have 20 saved rhythms. Delete a rhythm to save a new one.');
    else setProblem('Use plain text, up to 40 characters.');
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        atLimit ? (
          <Button title="Go to My rhythms" onPress={() => router.replace('/rhythms')} />
        ) : (
          <>
            <Button title={renaming ? 'Rename' : 'Save'} onPress={save} disabled={!valid} />
            <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
          </>
        )
      }
    >
      {atLimit ? (
        <Card muted>
          <AppText variant="heading">You have {MAX_RHYTHMS} saved rhythms.</AppText>
          <AppText>Delete a rhythm to save a new one. Nothing is replaced without asking.</AppText>
        </Card>
      ) : (
        <>
          <AppText variant="bodyStrong" nativeID="rhythm-name">
            Name
          </AppText>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setProblem(null);
            }}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Evening practice"
            placeholderTextColor={colors.inkFaint}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={valid ? save : undefined}
            accessibilityLabel="Name"
            accessibilityLabelledBy="rhythm-name"
            accessibilityHint="Up to 40 characters"
            style={styles.input}
          />
          <AppText variant="label">
            Up to {MAX_NAME_LENGTH} characters. {Array.from(name).length}/{MAX_NAME_LENGTH}
          </AppText>
          {problem ? (
            <AppText style={styles.problem} accessibilityRole="alert">
              {problem}
            </AppText>
          ) : null}
        </>
      )}
      <Card>
        <AppText variant="bodyStrong">{describeRhythm(subject.steps)}</AppText>
        <AppText variant="label">
          {describeTargetAndPlan(subject.steps, subject.target)}
        </AppText>
      </Card>
      <AppText variant="label">Saved on this device. You can keep up to {MAX_RHYTHMS} rhythms.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    ...textStyles.body,
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    backgroundColor: colors.surface,
  },
  problem: { color: colors.danger },
});
