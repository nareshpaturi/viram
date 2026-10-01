import { useCallback, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ConfirmPanel } from '../../src/components/ConfirmPanel';
import { Screen } from '../../src/components/Screen';
import { practiceHref } from '../../src/practice/launch';
import { findProgram, type Program } from '../../src/programs/definitions';
import {
  leave,
  nextSessionNumber,
  programTotals,
  restart,
  resume,
  sessionRun,
  sessionSubtitle,
  sessionTitle,
  type Enrollment,
} from '../../src/programs/engine';
import { stores } from '../../src/storage';
import { colors, radius, spacing } from '../../src/theme';

/**
 * A program's overview (FR-20): every session, its practice and length,
 * and the total before Start. Progress counts completed sessions; leaving
 * keeps it, and Restart begins again.
 */
export default function ProgramOverview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const current = id ? findProgram(id) : undefined;
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [other, setOther] = useState<Enrollment | null>(null);
  const [leaving, setLeaving] = useState(false);
  const refresh = useCallback(() => {
    const programs = stores().programs;
    setEnrollment(id ? programs.forProgram(id) : null);
    const active = programs.active();
    setOther(active && active.programId !== id ? active : null);
  }, [id]);
  useFocusEffect(refresh);

  // An enrollment runs on its own snapshot; otherwise show today's program.
  const program: Program | undefined = enrollment?.definition ?? current;
  if (!program) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">This program isn’t available.</AppText>
        <Button title="Go to Practices" variant="secondary" onPress={() => router.navigate('/practices')} />
      </Screen>
    );
  }

  const state = enrollment?.state ?? null;
  const next = enrollment ? nextSessionNumber(enrollment) : 1;
  const done = enrollment?.completedSessions ?? 0;
  const totals = programTotals(program);
  const save = (e: Enrollment) => {
    stores().programs.activate(e, Date.now());
    refresh();
  };
  const begin = (n: number) => {
    const run = sessionRun(program, n);
    if (run) router.push(practiceHref(run));
  };

  if (leaving && enrollment) {
    return (
      <Screen edges={['left', 'right']}>
        <ConfirmPanel
          title="Leave this program?"
          body={`Your ${done} completed ${done === 1 ? 'session stays' : 'sessions stay'} in History. You can pick up from session ${next} whenever you return.`}
          cancelLabel="Keep the program"
          confirmLabel="Leave program"
          onCancel={() => setLeaving(false)}
          onConfirm={() => {
            stores().programs.save(leave(enrollment, Date.now()));
            setLeaving(false);
            refresh();
            AccessibilityInfo.announceForAccessibility(`Left ${program.name}. Your progress is kept.`);
          }}
        />
      </Screen>
    );
  }

  const footer =
    state === 'active' ? (
      <>
        <Button title={`Begin session ${next}`} onPress={() => begin(next)} />
        <Button title="Leave program" variant="secondary" onPress={() => setLeaving(true)} />
      </>
    ) : state === 'left' && enrollment ? (
      <>
        <Button title={`Resume from session ${next}`} onPress={() => save(resume(enrollment, Date.now()))} />
        <Button title="Restart from session 1" variant="secondary" onPress={() => save(restart(enrollment, Date.now()))} />
      </>
    ) : state === 'completed' && enrollment ? (
      <Button title="Start again" onPress={() => save(restart(enrollment, Date.now()))} />
    ) : (
      <Button title="Start program" onPress={() => router.push({ pathname: '/program/start', params: { id: program.id } })} />
    );

  return (
    <Screen edges={['left', 'right']} footer={footer}>
      <AppText variant="overline">{program.eyebrow.toUpperCase()}</AppText>
      <AppText variant="title" accessibilityRole="header">
        {program.name}
      </AppText>
      <AppText style={styles.muted}>{program.description}</AppText>
      <View style={styles.chips}>
        {[`About ${totals.minutes} min`, 'One a day suggested', 'No streaks'].map((chip) => (
          <View key={chip} style={styles.chip}>
            <AppText variant="label">{chip}</AppText>
          </View>
        ))}
      </View>
      {state ? (
        <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
          {state === 'completed' ? 'Completed.' : `${done} of ${program.sessions.length} sessions complete.`}
          {state === 'left' ? ' Paused; your progress is kept.' : ''}
        </AppText>
      ) : null}
      {other && state !== 'active' ? (
        <AppText variant="label">Starting this pauses {other.definition.name}. Its progress is kept.</AppText>
      ) : null}
      <Card>
        {program.sessions.map((session, i) => {
          const n = i + 1;
          const phase = program.phases?.find((p) => p.first === n);
          const isDone = n <= done;
          const isNext = state === 'active' && n === next;
          return (
            <View key={n}>
              {phase ? (
                <AppText variant="overline" accessibilityRole="header" style={styles.phase}>
                  PHASE {program.phases!.indexOf(phase) + 1} · SESSIONS {phase.first}–{phase.last}
                </AppText>
              ) : null}
              <View
                style={[styles.row, isNext && styles.next]}
                accessible
                accessibilityLabel={`Session ${n}: ${sessionTitle(session)}, ${sessionSubtitle(session)}${isDone ? ', complete' : isNext ? ', next' : ''}`}
              >
                <View style={[styles.dot, isDone && styles.dotDone]}>
                  <AppText variant="label" style={isDone ? styles.dotDoneText : undefined}>
                    {isDone ? '✓' : n}
                  </AppText>
                </View>
                <View style={styles.text}>
                  <AppText variant="bodyStrong">{sessionTitle(session)}</AppText>
                  <AppText variant="label">{sessionSubtitle(session)}</AppText>
                </View>
                {isNext ? <AppText variant="label" style={styles.nextLabel}>Next</AppText> : null}
              </View>
            </View>
          );
        })}
      </Card>
      <AppText variant="label">Progress counts the sessions you complete, not days. Miss a day and nothing resets.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.ms, paddingVertical: spacing.xs },
  phase: { marginTop: spacing.sm, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radius.card },
  next: { backgroundColor: colors.surfaceMuted },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.pine, borderColor: colors.pine },
  dotDoneText: { color: colors.white },
  text: { flex: 1, gap: 2 },
  nextLabel: { color: colors.pine },
});
