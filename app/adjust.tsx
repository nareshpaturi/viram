import { useState } from 'react';
import { techniqueTarget } from '../src/content/targets';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { describePace, describePlan, guidedPace, perMinute, stepLabel } from '../src/breathing/describe';
import {
  MAX_MINUTES,
  MAX_ROUNDS,
  MAX_STEP_SECONDS,
  MINUTE_SHORTCUTS,
  ROUND_SHORTCUTS,
  formatPace,
  isValidSlowing,
  maxSeconds,
  minSeconds,
  nudgeSeconds,
  planFor,
  type Slowing,
  type Target,
} from '../src/breathing/rhythm';
import { AppText } from '../src/components/AppText';
import { Button, ButtonRow } from '../src/components/Button';
import { Segmented } from '../src/components/Segmented';
import { Screen } from '../src/components/Screen';
import { Stepper } from '../src/components/Stepper';
import { SwitchRow } from '../src/components/SwitchRow';
import {
  canSlow,
  customPractice,
  incrementOf,
  practiceFromTechnique,
  subtitleOf,
  type Practice,
} from '../src/practice/practice';
import { readyPractice } from '../src/practice/ready';
import { longHoldsOffered } from '../src/content/longHolds';
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

/** Keeps a slowing only while it still lengthens the breath from the current steps. */
function withValidSlowing(draft: Practice): Practice {
  return draft.slowing && !isValidSlowing(draft.steps, draft.slowing) ? { ...draft, slowing: null } : draft;
}

/**
 * Adjust rhythm (FR-01, FR-24). Library practices keep their steps and
 * sides and move in their own increment; the custom builder has four rows
 * in whole seconds, or half seconds when chosen. Coherent breathing and
 * custom rhythms can slow down gradually. Only the out-of-range stepper
 * action is ever disabled.
 */
export default function AdjustRhythm() {
  const params = useLocalSearchParams<{ technique?: string; rhythm?: string; custom?: string }>();
  const { preferences, update } = usePreferences();
  const [draft, setDraft] = useState(() => {
    const initial = initialDraft(params, () => readyPractice(preferences, stores()));
    return { ...initial, target: techniqueTarget(initial.techniqueId ? findTechnique(initial.techniqueId) : undefined, initial.target) };
  });
  const custom = draft.techniqueId === null;
  // Taught in rounds (4-7-8): rounds only, up to the taught limit.
  const taught = draft.techniqueId ? findTechnique(draft.techniqueId) : undefined;
  const maxRounds = taught?.practice.maxRounds;
  const [halfSteps, setHalfSteps] = useState(() => custom && draft.steps.some((s) => !Number.isInteger(s.seconds)));
  const increment = custom ? (halfSteps ? 0.5 : 1) : incrementOf(draft);
  const longHolds = longHoldsOffered() && preferences.longHolds;
  const slowing = draft.slowing ?? null;
  const plan = planFor(draft.steps, draft.target, slowing);
  const inhale = draft.steps.find((s) => s.kind === 'inhale');
  const exhale = draft.steps.find((s) => s.kind === 'exhale');
  const byRounds = 'rounds' in draft.target;
  const rounds = 'rounds' in draft.target ? draft.target.rounds : plan.rounds;
  const minutes = 'minutes' in draft.target ? draft.target.minutes : 5;

  const setTarget = (target: Target) => setDraft({ ...draft, target });
  const setSeconds = (index: number, direction: 1 | -1) => {
    const steps = draft.steps.map((step, i) => (i === index ? { ...step, seconds: nudgeSeconds(step.kind, step.seconds, direction, increment, longHolds) } : step));
    // The end of a slowing never starts shorter than the breath it slows.
    const floor = (kind: 'inhale' | 'exhale', end: number) => Math.max(end, steps.find((s) => s.kind === kind)?.seconds ?? end);
    setDraft({ ...draft, steps, slowing: slowing && { inhale: floor('inhale', slowing.inhale), exhale: floor('exhale', slowing.exhale) } });
  };
  const toggleHalfSteps = (on: boolean) => {
    setHalfSteps(on);
    // Back to whole seconds rounds each half up, within bounds.
    if (!on) setDraft({ ...draft, steps: draft.steps.map((s) => ({ ...s, seconds: Math.min(maxSeconds(s.kind, true), Math.ceil(s.seconds)) })) });
  };
  const toggleSlowing = (on: boolean) =>
    setDraft({
      ...draft,
      slowing: on && inhale && exhale ? { inhale: Math.min(MAX_STEP_SECONDS, inhale.seconds + 1), exhale: Math.min(MAX_STEP_SECONDS, exhale.seconds + 1) } : null,
    });
  const setEnd = (kind: keyof Slowing, direction: 1 | -1) =>
    slowing && setDraft({ ...draft, slowing: { ...slowing, [kind]: Math.min(MAX_STEP_SECONDS, slowing[kind] + direction * 0.5) } });

  const applyRhythm = () => {
    update({ lastPractice: withValidSlowing(draft) });
    router.dismissTo('/');
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <AppText variant="label" style={styles.summary} accessibilityLiveRegion="polite">
            {describePlan(draft.steps, draft.target, slowing)} · {guidedPace(describePace(plan))}
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
      {maxRounds ? (
        <View style={styles.group}>
          <Stepper
            label="Rounds"
            display={String(rounds)}
            spoken={`${rounds} rounds`}
            canDecrement={rounds > 1}
            canIncrement={rounds < maxRounds}
            onDecrement={() => setTarget({ rounds: rounds - 1 })}
            onIncrement={() => setTarget({ rounds: rounds + 1 })}
          />
          {taught?.guidance.roundsNote ? <AppText variant="label">{taught.guidance.roundsNote}</AppText> : null}
        </View>
      ) : null}
      {maxRounds ? null : (
        <Segmented
          label="Target"
          value={byRounds ? 'rounds' : 'minutes'}
          onChange={(kind) => setTarget(kind === 'rounds' ? { rounds: Math.min(MAX_ROUNDS, plan.rounds) } : { minutes: 5 })}
          options={[
            { value: 'minutes', label: 'Minutes' },
            { value: 'rounds', label: 'Rounds' },
          ]}
        />
      )}
      {maxRounds ? null : byRounds ? (
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
        <View style={styles.group}>
          <Stepper
            label="Minutes"
            display={`${minutes} min`}
            spoken={`${minutes} minutes`}
            canDecrement={minutes > 1}
            canIncrement={minutes < MAX_MINUTES}
            onDecrement={() => setTarget({ minutes: minutes - 1 })}
            onIncrement={() => setTarget({ minutes: minutes + 1 })}
          />
          <Segmented
            label="Minute shortcuts"
            wrap
            value={minutes}
            onChange={(value) => setTarget({ minutes: value })}
            options={MINUTE_SHORTCUTS.map((value) => ({ value, label: `${value} min`, accessibilityLabel: `${value} minutes` }))}
          />
          <AppText variant="label">Any length from 1 to {MAX_MINUTES} minutes.</AppText>
        </View>
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
              canIncrement={step.seconds < maxSeconds(step.kind, longHolds)}
              onDecrement={() => setSeconds(i, -1)}
              onIncrement={() => setSeconds(i, 1)}
            />
          );
        })}
      </View>
      <AppText variant="label">
        Inhale and exhale: 1–20 s. Holds: Off or 1–{longHolds ? 60 : 20} s.{increment === 0.5 && !custom ? ' This practice moves in half seconds.' : ''}
      </AppText>
      {custom ? <SwitchRow label="Half-second steps" description="Set each step in half seconds" value={halfSteps} onChange={toggleHalfSteps} /> : null}

      {canSlow(draft) && inhale && exhale ? (
        <View style={styles.group}>
          <SwitchRow label="Slow down gradually" description="Across the whole session" value={!!slowing} onChange={toggleSlowing} />
          {slowing ? (
            <>
              <Stepper
                label="End · inhale"
                display={`${slowing.inhale}s`}
                spoken={`${slowing.inhale} seconds`}
                canDecrement={slowing.inhale - 0.5 >= inhale.seconds}
                canIncrement={slowing.inhale < MAX_STEP_SECONDS}
                onDecrement={() => setEnd('inhale', -1)}
                onIncrement={() => setEnd('inhale', 1)}
              />
              <Stepper
                label="End · exhale"
                display={`${slowing.exhale}s`}
                spoken={`${slowing.exhale} seconds`}
                canDecrement={slowing.exhale - 0.5 >= exhale.seconds}
                canIncrement={slowing.exhale < MAX_STEP_SECONDS}
                onDecrement={() => setEnd('exhale', -1)}
                onIncrement={() => setEnd('exhale', 1)}
              />
              <AppText variant="label">
                {perMinute(formatPace(plan.breathsPerMinute))} at the start, {perMinute(formatPace(plan.endBreathsPerMinute))} at the end. Each round is a
                little longer than the last; holds stay the same.
              </AppText>
            </>
          ) : null}
        </View>
      ) : null}
      {draft.steps.some((s) => s.kind === 'rest') ? <AppText variant="label">Rest is the pause after exhaling.</AppText> : null}

      <ButtonRow>
        <Button
          title="Save as my rhythm"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/save-rhythm', params: { practice: JSON.stringify(withValidSlowing(draft)) } })}
        />
        <Button
          title="Share"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/share', params: { practice: JSON.stringify(withValidSlowing(draft)) } })}
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
