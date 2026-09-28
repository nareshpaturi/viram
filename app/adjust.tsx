import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { describePlan, stepLabel } from '../src/breathing/describe';
import {
  MAX_ROUNDS,
  MAX_STEP_SECONDS,
  MINUTE_TARGETS,
  ROUND_SHORTCUTS,
  formatPace,
  minSeconds,
  nudgeSeconds,
  planFor,
  type Target,
} from '../src/breathing/rhythm';
import { AppText } from '../src/components/AppText';
import { Button, ButtonRow } from '../src/components/Button';
import { Segmented } from '../src/components/Segmented';
import { Screen } from '../src/components/Screen';
import { Stepper } from '../src/components/Stepper';
import {
  customPractice,
  incrementOf,
  practiceFromTechnique,
  subtitleOf,
  type Practice,
} from '../src/practice/practice';
import { readyPractice } from '../src/practice/ready';
import { practiceFromRhythm } from '../src/rhythms/describe';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { findTechnique } from '../src/sharing/link';
import { stores } from '../src/storage';
import { colors, spacing } from '../src/theme';

function initialDraft(params: { technique?: string; rhythm?: string; custom?: string }, fallback: () => Practice): Practice {
  if (params.custom) return customPractice();
  const technique = params.technique ? findTechnique(params.technique) : undefined;
  if (technique) return practiceFromTechnique(technique);
  const rhythm = params.rhythm ? stores().rhythms.get(params.rhythm) : null;
  if (rhythm) return practiceFromRhythm(rhythm);
  return fallback();
}

/**
 * Adjust rhythm (FR-01). Library practices keep their steps and sides and
 * move in their own increment; the custom builder has four whole-second
 * rows. Only the out-of-range stepper action is ever disabled.
 */
export default function AdjustRhythm() {
  const params = useLocalSearchParams<{ technique?: string; rhythm?: string; custom?: string }>();
  const { preferences, update } = usePreferences();
  const [draft, setDraft] = useState(() => initialDraft(params, () => readyPractice(preferences, stores())));
  const increment = incrementOf(draft);
  const plan = planFor(draft.steps, draft.target);
  const byRounds = 'rounds' in draft.target;
  const rounds = 'rounds' in draft.target ? draft.target.rounds : plan.rounds;

  const setTarget = (target: Target) => setDraft({ ...draft, target });
  const setSeconds = (index: number, direction: 1 | -1) =>
    setDraft({
      ...draft,
      steps: draft.steps.map((step, i) => (i === index ? { ...step, seconds: nudgeSeconds(step.kind, step.seconds, direction, increment) } : step)),
    });

  const applyRhythm = () => {
    update({ lastPractice: draft });
    router.dismissTo('/');
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <AppText variant="label" style={styles.summary} accessibilityLiveRegion="polite">
            {describePlan(draft.steps, draft.target)} · guided {formatPace(plan.breathsPerMinute)} breaths/min
          </AppText>
          <Button title="Use this rhythm" onPress={applyRhythm} />
        </>
      }
    >
      <AppText variant="heading" accessibilityRole="header">
        {[draft.name, subtitleOf(draft)].filter(Boolean).join(' · ')}
      </AppText>
      {draft.source.kind === 'custom' ? <AppText style={styles.muted}>Your breath. Your rhythm.</AppText> : null}

      <AppText variant="overline" accessibilityRole="header">
        TARGET
      </AppText>
      <Segmented
        label="Target"
        value={byRounds ? 'rounds' : 'minutes'}
        onChange={(kind) => setTarget(kind === 'rounds' ? { rounds: Math.min(MAX_ROUNDS, plan.rounds) } : { minutes: 5 })}
        options={[
          { value: 'minutes', label: 'Minutes' },
          { value: 'rounds', label: 'Rounds' },
        ]}
      />
      {byRounds ? (
        <View style={styles.group}>
          <Stepper
            label="Rounds"
            display={String(rounds)}
            spoken={`${rounds} rounds`}
            canDecrement={rounds > 1}
            canIncrement={rounds < MAX_ROUNDS}
            onDecrement={() => setTarget({ rounds: rounds - 1 })}
            onIncrement={() => setTarget({ rounds: rounds + 1 })}
          />
          <Segmented
            label="Round shortcuts"
            wrap
            value={rounds}
            onChange={(value) => setTarget({ rounds: value })}
            options={ROUND_SHORTCUTS.map((value) => ({ value, label: String(value), accessibilityLabel: `${value} rounds` }))}
          />
          <AppText variant="label">Any count from 1 to {MAX_ROUNDS}.</AppText>
        </View>
      ) : (
        <Segmented
          label="Duration"
          wrap
          value={'minutes' in draft.target ? draft.target.minutes : null}
          onChange={(minutes) => setTarget({ minutes })}
          options={MINUTE_TARGETS.map((value) => ({ value, label: `${value} min`, accessibilityLabel: `${value} minutes` }))}
        />
      )}

      <AppText variant="overline" accessibilityRole="header" style={styles.section}>
        STEPS
      </AppText>
      <View>
        {draft.steps.map((step, i) => {
          const off = step.seconds === 0;
          return (
            <Stepper
              key={i}
              label={stepLabel(step)}
              display={off ? 'Off' : `${step.seconds}s`}
              spoken={off ? 'Off' : `${step.seconds} seconds`}
              canDecrement={step.seconds > minSeconds(step.kind)}
              canIncrement={step.seconds < MAX_STEP_SECONDS}
              onDecrement={() => setSeconds(i, -1)}
              onIncrement={() => setSeconds(i, 1)}
            />
          );
        })}
      </View>
      <AppText variant="label">
        Inhale and exhale: 1–20 s. Holds: Off or 1–20 s.{increment === 0.5 ? ' This practice moves in half seconds.' : ''}
      </AppText>
      {draft.steps.some((s) => s.kind === 'rest') ? <AppText variant="label">Rest is the pause after exhaling.</AppText> : null}

      <ButtonRow>
        <Button
          title="Save as my rhythm"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/save-rhythm', params: { practice: JSON.stringify(draft) } })}
        />
        <Button
          title="Share"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/share', params: { practice: JSON.stringify(draft) } })}
        />
      </ButtonRow>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  summary: { textAlign: 'center', color: colors.ink },
  group: { gap: spacing.sm },
  section: { marginTop: spacing.sm },
  flex: { flexGrow: 1, flexBasis: 140 },
});
