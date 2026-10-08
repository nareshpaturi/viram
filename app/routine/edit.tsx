import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { describeRhythm, describeTarget } from '../../src/breathing/describe';
import { MAX_MINUTES } from '../../src/breathing/rhythm';
import { AppText } from '../../src/components/AppText';
import { Button, ButtonRow } from '../../src/components/Button';
import { ConfirmPanel } from '../../src/components/ConfirmPanel';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { Screen } from '../../src/components/Screen';
import { Sheet } from '../../src/components/Sheet';
import { Stepper } from '../../src/components/Stepper';
import { LIBRARY } from '../../src/content/library';
import { MAX_ROUTINE_PARTS } from '../../src/practice/run';
import { routineSummary } from '../../src/routines/describe';
import { MIN_ROUTINE_PARTS, resolveSegment, type RoutineSegment, type SegmentRef } from '../../src/routines/repository';
import { rhythmSubtitle } from '../../src/rhythms/describe';
import { MAX_NAME_LENGTH, cleanName } from '../../src/sharing/link';
import { stores } from '../../src/storage';
import { colors, radius, spacing, textStyles, touchTarget } from '../../src/theme';

interface Draft extends RoutineSegment {
  /** Stable key while editing; segments may repeat a practice. */
  key: string;
}

let nextKey = 0;
const withKey = (segment: RoutineSegment): Draft => ({ ...segment, key: String(nextKey++) });

/**
 * Build or edit a routine (FR-14): 2–6 practices, each with its minutes.
 * Reordering uses Move up / Move down so it works with screen readers.
 */
export default function EditRoutine() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useMemo(() => (id ? stores().routines.get(id) : null), [id]);
  const [name, setName] = useState(existing?.name ?? '');
  const [segments, setSegments] = useState<Draft[]>(() => existing?.segments.map(withKey) ?? []);
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const rhythms = stores().rhythms.list();
  const resolved = segments.map((s) => resolveSegment(s, stores().rhythms));
  const valid = cleanName(name) !== null && segments.length >= MIN_ROUTINE_PARTS && resolved.every(Boolean);

  // Functional updates, so quick repeated taps each count.
  const step = (index: number, by: -1 | 1) =>
    setSegments((current) =>
      current.map((s, i) => (i === index ? { ...s, minutes: Math.min(MAX_MINUTES, Math.max(1, s.minutes + by)) } : s)),
    );
  const move = (index: number, by: -1 | 1) => {
    setSegments((current) => {
      const next = [...current];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
    AccessibilityInfo.announceForAccessibility(`Moved to position ${index + by + 1}`);
  };
  const add = (ref: SegmentRef, minutes: number) => {
    setSegments((current) => [...current, withKey({ ref, minutes })]);
    setPicking(false);
  };

  const save = () => {
    const result = stores().routines.save({ id: existing?.id, name, segments: segments.map(({ ref, minutes }) => ({ ref, minutes })) });
    if (!result.ok) {
      setProblem(result.reason === 'limit' ? 'You have 20 routines. Delete one to save a new one.' : 'Give the routine a plain-text name and 2–6 practices.');
      return;
    }
    AccessibilityInfo.announceForAccessibility('Routine saved');
    router.replace({ pathname: '/routine/[id]', params: { id: result.routine.id } });
  };

  if (deleting && existing) {
    return (
      <Screen edges={['left', 'right']}>
        <ConfirmPanel
          title={`Delete “${existing.name}”?`}
          body="The routine leaves this device. Practices you already did with it stay in History."
          cancelLabel="Keep routine"
          confirmLabel="Delete routine"
          destructive
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            stores().routines.remove(existing.id);
            router.dismissTo('/practices');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <AppText variant="label" style={styles.summary} accessibilityLiveRegion="polite">
            {resolved.length && resolved.every(Boolean) ? routineSummary(resolved.filter((p) => p !== null)) : `${segments.length} of ${MIN_ROUTINE_PARTS}–${MAX_ROUTINE_PARTS} practices`}
          </AppText>
          <Button title="Save routine" onPress={save} disabled={!valid} />
        </>
      }
    >
      <AppText variant="bodyStrong" nativeID="routine-name">
        Name
      </AppText>
      <TextInput
        value={name}
        onChangeText={(text) => {
          setName(text);
          setProblem(null);
        }}
        maxLength={MAX_NAME_LENGTH}
        placeholder="Morning practice"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Routine name"
        accessibilityLabelledBy="routine-name"
        style={styles.input}
      />
      <AppText variant="overline" accessibilityRole="header">
        PRACTICES
      </AppText>
      {segments.map((segment, i) => {
        const practice = resolved[i];
        return (
          <View key={segment.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <AppText variant="bodyStrong" style={styles.number}>
                {i + 1}
              </AppText>
              <View style={styles.text}>
                <AppText variant="bodyStrong">{practice ? practice.name : 'A deleted rhythm'}</AppText>
                <AppText variant="label">{practice ? describeRhythm(practice.steps) : 'Remove it or choose another practice.'}</AppText>
              </View>
            </View>
            {practice && 'rounds' in practice.target ? (
              // A practice taught in rounds (4-7-8) keeps its taught count in a routine.
              <AppText variant="label">{`${describeTarget(practice.target)}, as taught`}</AppText>
            ) : (
              <Stepper
                label="Minutes"
                display={`${segment.minutes}m`}
                spoken={`${segment.minutes} minutes`}
                canDecrement={segment.minutes > 1}
                canIncrement={segment.minutes < MAX_MINUTES}
                onDecrement={() => step(i, -1)}
                onIncrement={() => step(i, 1)}
              />
            )}
            <View style={styles.actions}>
              <SmallAction label="Move up" disabled={i === 0} onPress={() => move(i, -1)} />
              <SmallAction label="Move down" disabled={i === segments.length - 1} onPress={() => move(i, 1)} />
              <SmallAction label="Remove" onPress={() => setSegments((current) => current.filter((_, k) => k !== i))} />
            </View>
          </View>
        );
      })}
      {segments.length < MAX_ROUTINE_PARTS ? <Button title="+ Add practice" variant="secondary" onPress={() => setPicking(true)} /> : null}
      <AppText variant="label">
        {MIN_ROUTINE_PARTS}–{MAX_ROUTINE_PARTS} practices; one can appear more than once. Five quiet seconds introduce each practice.
      </AppText>
      {problem ? (
        <AppText accessibilityRole="alert" style={styles.problem}>
          {problem}
        </AppText>
      ) : null}
      {existing ? (
        <ButtonRow>
          <Button title="Delete routine" variant="destructive" style={styles.flex} onPress={() => setDeleting(true)} />
        </ButtonRow>
      ) : null}

      <Sheet visible={picking} title="Add a practice" onClose={() => setPicking(false)}>
        <RowGroup title="Library">
          {LIBRARY.map((t) => (
            <ListRow
              key={t.id}
              title={t.name}
              subtitle={t.subtitle}
              detail={describeRhythm(t.practice.steps)}
              onPress={() => add({ kind: 'technique', id: t.id }, 'minutes' in t.practice.target ? t.practice.target.minutes : 5)}
            />
          ))}
        </RowGroup>
        {rhythms.length ? (
          <RowGroup title="My rhythms">
            {rhythms.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                subtitle={rhythmSubtitle(r)}
                onPress={() => add({ kind: 'rhythm', id: r.id }, 'minutes' in r.target ? r.target.minutes : 5)}
              />
            ))}
          </RowGroup>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function SmallAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.small, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <AppText variant="label" style={styles.smallText}>
        {label}
      </AppText>
    </Pressable>
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
  card: { borderWidth: 1, borderColor: colors.divider, borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.xs },
  cardHeader: { flexDirection: 'row', gap: spacing.ms, alignItems: 'center' },
  number: { minWidth: 20, color: colors.inkSoft },
  text: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  small: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.ms,
    justifyContent: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  smallText: { color: colors.pine },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.35 },
  summary: { textAlign: 'center', color: colors.ink },
  problem: { color: colors.danger },
  flex: { flexGrow: 1 },
});
