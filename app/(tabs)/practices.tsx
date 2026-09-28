import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { describeRhythm, describeTarget } from '../../src/breathing/describe';
import { practiceFromRhythm, rhythmSubtitle } from '../../src/rhythms/describe';
import { AppText } from '../../src/components/AppText';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { Screen } from '../../src/components/Screen';
import { LIBRARY } from '../../src/content/library';
import type { Technique } from '../../src/content/types';
import type { SavedRhythm } from '../../src/rhythms/repository';
import { MAX_RHYTHMS } from '../../src/rhythms/repository';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors } from '../../src/theme';

const FAMILIES: { family: Technique['family']; title: string }[] = [
  { family: 'classical', title: 'Classical pranayama' },
  { family: 'modern', title: 'Modern patterns' },
];

/** Practices (FR-08): the library in two groups, then My rhythms. */
export default function Practices() {
  const { update } = usePreferences();
  const [rhythms, setRhythms] = useState<SavedRhythm[]>([]);
  useFocusEffect(useCallback(() => setRhythms(stores().rhythms.list()), []));

  const makeReady = (rhythm: SavedRhythm) => {
    update({ lastPractice: practiceFromRhythm(rhythm) });
    router.navigate('/');
  };

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Practices
      </AppText>
      <AppText style={styles.muted}>Traditional techniques, explained simply. Each shows how to practice, when to take care, and its sources.</AppText>
      {FAMILIES.map(({ family, title }) => (
        <RowGroup key={family} title={title}>
          {LIBRARY.filter((t) => t.family === family).map((technique) => (
            <ListRow
              key={technique.id}
              title={technique.name}
              subtitle={technique.subtitle}
              detail={describeRhythm(technique.practice.steps)}
              trailing={describeTarget(technique.practice.target)}
              accessibilityHint={technique.pronunciation ? `Said ${technique.pronunciation.respelling}. Opens the guide.` : 'Opens the guide.'}
              onPress={() => router.push({ pathname: '/technique/[id]', params: { id: technique.id } })}
            />
          ))}
        </RowGroup>
      ))}
      <RowGroup title="My rhythms">
        {rhythms.length === 0 ? (
          <ListRow
            title="Your breath. Your rhythm."
            subtitle="Save a rhythm from Adjust rhythm, or open a shared link, and it appears here."
          />
        ) : (
          rhythms.slice(0, 3).map((rhythm) => (
            <ListRow
              key={rhythm.id}
              title={rhythm.name}
              subtitle={rhythmSubtitle(rhythm)}
              accessibilityHint="Makes this the ready practice on Breathe"
              onPress={() => makeReady(rhythm)}
            />
          ))
        )}
        <ListRow title="Build a custom rhythm" subtitle="Four steps, in whole seconds" onPress={() => router.push({ pathname: '/adjust', params: { custom: '1' } })} />
        {rhythms.length > 0 ? (
          <ListRow
            title={`All my rhythms (${rhythms.length})`}
            subtitle={`${rhythms.length} of ${MAX_RHYTHMS} saved. Rename, share, or delete.`}
            onPress={() => router.push('/rhythms')}
          />
        ) : null}
      </RowGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
});
