import { useCallback, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { describeRhythm, describeTarget } from '../../src/breathing/describe';
import { practiceFromRhythm, rhythmSubtitle } from '../../src/rhythms/describe';
import { routineChain, routineSummary } from '../../src/routines/describe';
import { resolveSegment, routineRun, type Routine } from '../../src/routines/repository';
import { AppText } from '../../src/components/AppText';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { Screen } from '../../src/components/Screen';
import { LIBRARY } from '../../src/content/library';
import { matches, searchLibrary } from '../../src/content/search';
import { PROGRAMS } from '../../src/programs/definitions';
import { nextSessionNumber, programTotals, totalSessions, type Enrollment } from '../../src/programs/engine';
import type { Technique } from '../../src/content/types';
import type { SavedRhythm } from '../../src/rhythms/repository';
import { MAX_RHYTHMS } from '../../src/rhythms/repository';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors, radius, spacing, textStyles, touchTarget } from '../../src/theme';

const FAMILIES: { family: Technique['family']; title: string }[] = [
  { family: 'classical', title: 'Classical pranayama' },
  { family: 'modern', title: 'Modern patterns' },
];

/** Practices (FR-08, FR-14, FR-20): programs and routines first, the library in two groups, then My rhythms. */
export default function Practices() {
  const { update } = usePreferences();
  const [rhythms, setRhythms] = useState<SavedRhythm[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  useFocusEffect(
    useCallback(() => {
      setRhythms(stores().rhythms.list());
      setRoutines(stores().routines.list());
      setEnrollments(stores().programs.all());
    }, []),
  );
  const progress = (programId: string) => {
    const e = enrollments.find((x) => x.programId === programId);
    if (!e) return null;
    if (e.state === 'completed') return 'Completed';
    return `${e.state === 'active' ? 'Next' : 'Paused at'}: session ${nextSessionNumber(e)} of ${totalSessions(e)}`;
  };

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
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search, e.g. Anulom Vilom"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Search practices"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        style={styles.search}
      />
      {searching ? (
        <SearchResults query={query} rhythms={rhythms} routines={routines} onRhythm={makeReady} />
      ) : (
        <>
          <RowGroup title="Programs">
            {PROGRAMS.map((program) => (
              <ListRow
                key={program.id}
                title={program.name}
                subtitle={`${program.summary} About ${programTotals(program).minutes} min in total.`}
                detail={progress(program.id) ?? program.eyebrow}
                onPress={() =>
                  router.push({
                    pathname: '/program/[id]',
                    params: { id: program.id },
                  })
                }
              />
            ))}
          </RowGroup>
          <RowGroup title="Routines">
            {routines.map((routine) => {
              const resolved = routineRun(routine, stores().rhythms);
              const names = routine.segments.map(
                (s) =>
                  resolveSegment(s, stores().rhythms) ?? {
                    name: 'A deleted rhythm',
                  },
              );
              return (
                <ListRow
                  key={routine.id}
                  title={routine.name}
                  subtitle={routineChain(names)}
                  trailing={'run' in resolved ? routineSummary(resolved.run.parts).split(' · ')[1] : 'Needs a change'}
                  onPress={() =>
                    router.push({
                      pathname: '/routine/[id]',
                      params: { id: routine.id },
                    })
                  }
                />
              );
            })}
            <ListRow title="Build a routine" subtitle="Chain 2–6 practices" onPress={() => router.push('/routine/edit')} />
          </RowGroup>
          {FAMILIES.map(({ family, title }) => (
            <RowGroup key={family} title={title}>
              {LIBRARY.filter((t) => t.family === family).map((technique) => (
                <ListRow
                  key={technique.id}
                  title={technique.name}
                  subtitle={technique.aliases?.length ? `${technique.subtitle} · also ${technique.aliases.join(', ')}` : technique.subtitle}
                  detail={describeRhythm(technique.practice.steps)}
                  trailing={describeTarget(technique.practice.target)}
                  accessibilityHint={technique.pronunciation ? `Said ${technique.pronunciation.respelling}. Opens the guide.` : 'Opens the guide.'}
                  onPress={() =>
                    router.push({
                      pathname: '/technique/[id]',
                      params: { id: technique.id },
                    })
                  }
                />
              ))}
            </RowGroup>
          ))}
          <RowGroup title="My rhythms">
            {rhythms.length === 0 ? (
              <ListRow title="Your breath. Your rhythm." subtitle="Save a rhythm from Adjust rhythm, or open a shared link, and it appears here." />
            ) : (
              rhythms
                .slice(0, 3)
                .map((rhythm) => (
                  <ListRow
                    key={rhythm.id}
                    title={rhythm.name}
                    subtitle={rhythmSubtitle(rhythm)}
                    accessibilityHint="Makes this the ready practice on Breathe"
                    onPress={() => makeReady(rhythm)}
                  />
                ))
            )}
            <ListRow
              title="Build a custom rhythm"
              subtitle="Four steps, in whole seconds"
              onPress={() => router.push({ pathname: '/adjust', params: { custom: '1' } })}
            />
            {rhythms.length > 0 ? (
              <ListRow
                title={`All my rhythms (${rhythms.length})`}
                subtitle={`${rhythms.length} of ${MAX_RHYTHMS} saved. Rename, share, or delete.`}
                onPress={() => router.push('/rhythms')}
              />
            ) : null}
          </RowGroup>
        </>
      )}
    </Screen>
  );
}

function SearchResults({
  query,
  rhythms,
  routines,
  onRhythm,
}: {
  query: string;
  rhythms: SavedRhythm[];
  routines: Routine[];
  onRhythm: (r: SavedRhythm) => void;
}) {
  const techniques = searchLibrary(LIBRARY, query);
  const myRhythms = rhythms.filter((r) => matches(query, [r.name]));
  const myRoutines = routines.filter((r) => matches(query, [r.name]));
  const count = techniques.length + myRhythms.length + myRoutines.length;
  return (
    <RowGroup title={count ? `${count} ${count === 1 ? 'result' : 'results'}` : 'No results'}>
      {count === 0 ? <ListRow title="Nothing matches that yet." subtitle="Try an English name, like “humming” or “box”." /> : null}
      {techniques.map((technique) => (
        <ListRow
          key={technique.id}
          title={technique.name}
          subtitle={technique.aliases?.length ? `${technique.subtitle} · also ${technique.aliases.join(', ')}` : technique.subtitle}
          detail={describeRhythm(technique.practice.steps)}
          trailing={describeTarget(technique.practice.target)}
          onPress={() =>
            router.push({
              pathname: '/technique/[id]',
              params: { id: technique.id },
            })
          }
        />
      ))}
      {myRoutines.map((routine) => (
        <ListRow
          key={routine.id}
          title={routine.name}
          subtitle="Routine"
          onPress={() =>
            router.push({
              pathname: '/routine/[id]',
              params: { id: routine.id },
            })
          }
        />
      ))}
      {myRhythms.map((rhythm) => (
        <ListRow key={rhythm.id} title={rhythm.name} subtitle={rhythmSubtitle(rhythm)} onPress={() => onRhythm(rhythm)} />
      ))}
    </RowGroup>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  search: {
    ...textStyles.body,
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    backgroundColor: colors.surface,
  },
});
