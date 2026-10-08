import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { describeTarget } from '../../src/breathing/describe';
import { practiceFromRhythm, rhythmSubtitle } from '../../src/rhythms/describe';
import { routineChain, routineSummary } from '../../src/routines/describe';
import { resolveSegment, routineRun, type Routine } from '../../src/routines/repository';
import { AppText } from '../../src/components/AppText';
import { Icon } from '../../src/components/Icons';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { ProgramCard } from '../../src/components/ProgramCard';
import { RhythmOrb } from '../../src/components/RhythmOrb';
import { Screen } from '../../src/components/Screen';
import { LIBRARY } from '../../src/content/library';
import { matches, searchLibrary } from '../../src/content/search';
import { PROGRAMS } from '../../src/programs/definitions';
import { nextSessionNumber, programTotals, totalSessions, type Enrollment } from '../../src/programs/engine';
import type { Technique } from '../../src/content/types';
import type { SavedRhythm } from '../../src/rhythms/repository';
import { MAX_RHYTHMS } from '../../src/rhythms/repository';
import { useGlass, useWash } from '../../src/light/light';
import { Wash } from '../../src/light/Wash';
import { WASHES } from '../../src/light/washes';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import type { PracticesSection } from '../../src/settings/preferences';
import { stores } from '../../src/storage';
import { colors, radius, spacing, textStyles, touchTarget } from '../../src/theme';

const FAMILIES: { family: Technique['family']; title: string }[] = [
  { family: 'classical', title: 'Classical pranayama' },
  { family: 'modern', title: 'Modern patterns' },
];

/**
 * Practices (FR-08, FR-14, FR-20; UX02): search over everything, then one
 * section at a time: Techniques (the library in two groups), Programs, or
 * Saved (My rhythms and Routines). The last section stays open.
 */
export default function Practices() {
  const { preferences, update } = usePreferences();
  const section = preferences.practicesSection;
  const [rhythms, setRhythms] = useState<SavedRhythm[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const wash = useWash() ?? 'day';
  const glass = useGlass();
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
    // The light fades into paper by 470 px, so the long list stays plain.
    <Screen background={<Wash wash={WASHES[wash]} fadeToPaper={{ from: 200, to: 470 }} />}>
      <AppText variant="title" accessibilityRole="header">
        Practices
      </AppText>
      <View style={[styles.search, { backgroundColor: glass.fill, borderColor: glass.outline }]}>
        <Icon name="search" color={colors.inkSoftOnWash} size={18} strokeWidth={1.8} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, like Anulom Vilom"
          placeholderTextColor={colors.inkSoftOnWash}
          accessibilityLabel="Search practices"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>
      {searching ? (
        <SearchResults query={query} rhythms={rhythms} routines={routines} onRhythm={makeReady} />
      ) : (
        <>
          <SectionTabs value={section} onChange={(practicesSection) => update({ practicesSection })} />
          {section === 'techniques'
            ? FAMILIES.map(({ family, title }) => (
                <RowGroup key={family} title={title} tone="white">
                  {LIBRARY.filter((t) => t.family === family).map((technique) => (
                    <TechniqueRow key={technique.id} technique={technique} />
                  ))}
                </RowGroup>
              ))
            : null}
          {section === 'programs' ? (
            <View style={styles.programs}>
              {PROGRAMS.map((program) => {
                const enrolled = enrollments.find((e) => e.programId === program.id);
                const total = program.sessions.length;
                return (
                  <ProgramCard
                    key={program.id}
                    fullWidth
                    programId={program.id}
                    eyebrow={progress(program.id) ?? program.eyebrow}
                    name={program.name}
                    summary={program.summary}
                    minutes={programTotals(program).minutes}
                    sessions={total <= 10 ? { total, done: enrolled?.completedSessions ?? 0 } : null}
                    onPress={() => router.push({ pathname: '/program/[id]', params: { id: program.id } })}
                  />
                );
              })}
            </View>
          ) : null}
          {section === 'saved' ? (
            <>
              <RowGroup title="My rhythms" tone="white">
                {rhythms.length === 0 ? (
                  <ListRow title="Your breath. Your rhythm." subtitle="Save a rhythm from Adjust rhythm, or open a shared link, and it appears here." />
                ) : (
                  rhythms
                    .slice(0, 3)
                    .map((rhythm) => (
                      <ListRow
                        key={rhythm.id}
                        leading={<RhythmOrb steps={rhythm.steps} size={40} />}
                        title={rhythm.name}
                        subtitle={rhythmSubtitle(rhythm)}
                        accessibilityHint="Makes this the ready practice on Breathe"
                        onPress={() => makeReady(rhythm)}
                      />
                    ))
                )}
                <ListRow
                  leading={<PlusMark />}
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
              <RowGroup title="Routines" tone="white">
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
                      leading={<RhythmOrb steps={names.flatMap((p) => ('steps' in p ? p.steps : []))} size={40} />}
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
                <ListRow leading={<PlusMark />} title="Build a routine" subtitle="Chain 2–6 practices" onPress={() => router.push('/routine/edit')} />
              </RowGroup>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const SECTIONS: { value: PracticesSection; label: string }[] = [
  { value: 'techniques', label: 'Techniques' },
  { value: 'programs', label: 'Programs' },
  { value: 'saved', label: 'Saved' },
];

/** Techniques, Programs, or Saved: pill segments announced as tabs. */
function SectionTabs({ value, onChange }: { value: PracticesSection; onChange: (section: PracticesSection) => void }) {
  const glass = useGlass();
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Practice sections" style={styles.tabs}>
      {SECTIONS.map((section) => {
        const selected = section.value === value;
        return (
          <Pressable
            key={section.value}
            onPress={() => onChange(section.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.tab,
              selected ? styles.tabSelected : { backgroundColor: glass.fill, borderColor: glass.outline },
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="control" numberOfLines={1} adjustsFontSizeToFit style={[styles.tabText, selected && styles.tabTextSelected]}>
              {section.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A library row: orb, name, English name, and how long it runs. Other names stay searchable. */
function TechniqueRow({ technique, alias }: { technique: Technique; alias?: string | null }) {
  return (
    <ListRow
      leading={<RhythmOrb steps={technique.practice.steps} size={40} />}
      title={technique.name}
      subtitle={alias ? `${technique.subtitle} · also ${alias}` : technique.subtitle}
      trailing={describeTarget(technique.practice.target)}
      accessibilityHint={technique.pronunciation ? `Said ${technique.pronunciation.respelling}. Opens the guide.` : 'Opens the guide.'}
      onPress={() =>
        router.push({
          pathname: '/technique/[id]',
          params: { id: technique.id },
        })
      }
    />
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
    <RowGroup title={count ? `${count} ${count === 1 ? 'result' : 'results'}` : 'No results'} tone="white">
      {count === 0 ? <ListRow title="Nothing matches that yet." subtitle="Try an English name, like “humming” or “box”." /> : null}
      {techniques.map((technique) => (
        <TechniqueRow key={technique.id} technique={technique} alias={matchedAlias(technique, query)} />
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

/** The other name a search found, when the name itself didn't match: “also Anulom Vilom”. */
function matchedAlias(technique: Technique, query: string): string | null {
  if (matches(query, [technique.name, technique.subtitle])) return null;
  return technique.aliases?.find((alias) => matches(query, [alias])) ?? null;
}

/** The leading mark for “Build …” rows: a plus in a mist circle. */
function PlusMark() {
  return (
    <View style={styles.plus} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name="plus" color={colors.pine} size={18} strokeWidth={1.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
  },
  searchInput: { ...textStyles.body, flex: 1, minWidth: 0, paddingVertical: spacing.ms },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: -2, marginBottom: spacing.sm },
  tab: { flex: 1, minHeight: touchTarget, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  tabSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  tabText: { fontSize: 15 },
  tabTextSelected: { color: colors.surface },
  pressed: { opacity: 0.85 },
  programs: { gap: spacing.ms },
  plus: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
});
