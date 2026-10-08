import { useEffect, useMemo } from 'react';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from '../src/accessibility/motion';
import { describeRhythm, describeTarget, formatClock, routeLabel, stepLabel } from '../src/breathing/describe';
import type { PauseReason } from '../src/breathing/session';
import { guideCount } from '../src/breathing/timeline';
import { AppText } from '../src/components/AppText';
import { BreathingGuide } from '../src/components/BreathingGuide';
import { Button } from '../src/components/Button';
import { SideIndicator } from '../src/components/SideIndicator';
import { practicePath } from '../src/practice/launch';
import { captionFor, subtitleOf } from '../src/practice/practice';
import { parseRun, type PracticeRun } from '../src/practice/run';
import { findTechnique } from '../src/sharing/link';
import { usePracticeSession, type SessionView } from '../src/practice/usePracticeSession';
import { Wash } from '../src/light/Wash';
import { PRACTICE_LIGHT } from '../src/light/washes';
import { SurfaceProvider, useSurface } from '../src/night/surface';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { colors, spacing, touchTarget } from '../src/theme';

const PAUSE_TITLE: Record<PauseReason, string> = {
  user: 'Take your time.',
  call: 'Paused for a call.',
  audio: 'Paused for other audio.',
  headphones: 'Paused: headphones disconnected.',
  lockScreen: 'Paused from the lock screen.',
  locked: 'Paused when your phone locked.',
};

function readRun(raw: string | undefined): PracticeRun | null {
  try {
    return raw ? parseRun(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** The practice route: validates its practice or routine, then runs it. */
export default function PracticeRoute() {
  const params = useLocalSearchParams<{ run?: string; quick?: string }>();
  const run = useMemo(() => readRun(params.run), [params.run]);
  const { preferences } = usePreferences();

  if (!run) return <Redirect href="/" />;
  if (!preferences.firstUseComplete) {
    return <Redirect href={{ pathname: '/welcome', params: { next: practicePath(run, { quickStart: params.quick === '1' }) } }} />;
  }
  return (
    <SurfaceProvider setting={preferences.nightPractice}>
      <PracticeScreen run={run} quickStart={params.quick === '1'} />
    </SurfaceProvider>
  );
}

function PracticeScreen({ run, quickStart }: { run: PracticeRun; quickStart: boolean }) {
  const { preferences, update } = usePreferences();
  const reducedMotion = useReducedMotion(preferences.motion);
  const { width, height } = useWindowDimensions();
  const surface = useSurface();
  const { plans, view, countingAloud, actions } = usePracticeSession({
    run,
    preferences,
    quickStart,
    night: surface.night,
    onIntroHeard: (id) =>
      update({ introductionsHeard: [...new Set([...preferences.introductionsHeard, id])] }),
  });

  // Leaving is always deliberate: the back gesture asks to end.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view.kind === 'running' || view.kind === 'paused') actions.askToEnd();
      else if (view.kind === 'intro' || (view.kind === 'countdown' && view.purpose === 'settle')) actions.cancel();
      return true;
    });
    return () => subscription.remove();
  }, [actions, view]);

  useEffect(() => {
    if (view.kind === 'finished') {
      router.replace({ pathname: '/complete', params: { record: JSON.stringify(view.record), ...(surface.night ? { night: '1' } : {}) } });
    }
    if (view.kind === 'cancelled') router.back();
  }, [view]);

  // The lock tip shows once, on a settle screen with sound.
  const showLockTip = !preferences.lockTipSeen && preferences.cueMode !== 'silent';
  useEffect(() => {
    if (view.kind === 'running' && showLockTip) update({ lockTipSeen: true });
  }, [showLockTip, update, view.kind]);

  const guideSize = Math.max(180, Math.min(300, width - spacing.xxl * 2, height * 0.36));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: surface.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {surface.night ? null : <Wash wash={PRACTICE_LIGHT} />}
      <StatusBar style="light" />
      <Body
        view={view}
        run={run}
        rounds={plans.map((p) => p.rounds)}
        durations={plans.map((p) => p.durationMs)}
        guideSize={guideSize}
        reducedMotion={reducedMotion}
        countingAloud={countingAloud}
        showLockTip={showLockTip}
        quickStart={quickStart}
        actions={actions}
      />
    </SafeAreaView>
  );
}

interface BodyProps {
  view: SessionView;
  run: PracticeRun;
  rounds: number[];
  /** Each part's planned duration, for the session ring. */
  durations: number[];
  guideSize: number;
  reducedMotion: boolean;
  /** The voice counts within steps, so the guide shows the count instead of seconds left. */
  countingAloud: boolean;
  showLockTip: boolean;
  quickStart: boolean;
  actions: ReturnType<typeof usePracticeSession>['actions'];
}

function Body({ view, run, rounds, durations, guideSize, reducedMotion, countingAloud, showLockTip, quickStart, actions }: BodyProps) {
  const routine = run.parts.length > 1;
  const practiceOf = (part: number) => run.parts[part];
  const partLabel = (part: number) => (routine ? `Practice ${part + 1} of ${run.parts.length}` : null);
  switch (view.kind) {
    case 'loading':
      return (
        <Centered>
          <AppText variant="phase" accessibilityRole="header">
            Getting ready
          </AppText>
        </Centered>
      );

    case 'intro':
      return (
        <View style={styles.fill}>
          <TopBar left={{ label: 'Cancel', onPress: actions.cancel }} right={`Introduction · ${formatClock(view.remainingMs)} left`} />
          <View style={styles.introBody}>
            <AppText variant="phase" accessibilityRole="header">
              {run.parts[0].name}
            </AppText>
            {view.lines.slice(0, view.line + 1).map((line, i) => (
              <AppText key={i} style={[styles.caption, i < view.line && styles.captionPast]} accessibilityLiveRegion={i === view.line ? 'polite' : 'none'}>
                {line}
              </AppText>
            ))}
          </View>
          <Button title="Skip introduction" variant="onPineQuiet" onPress={actions.skipIntro} />
        </View>
      );

    case 'countdown': {
      if (view.purpose === 'transition') {
        const next = practiceOf(view.part);
        // The technique's first how-to line is its setup, such as hand position.
        const setup = next.techniqueId ? findTechnique(next.techniqueId)?.guidance.howTo[0] : undefined;
        return (
          <View style={styles.fill}>
            <TopBar left={{ label: 'End', onPress: actions.askToEnd }} right={partLabel(view.part) ?? ''} />
            <Centered>
              <AppText variant="countdown" style={styles.bigCount} maxFontSizeMultiplier={1.4} accessibilityLabel={`${view.seconds} seconds`}>
                {view.seconds}
              </AppText>
              <AppText variant="label" style={styles.muted}>
                Up next
              </AppText>
              <AppText variant="phase" accessibilityRole="header" style={styles.centerText}>
                {next.name}
              </AppText>
              <AppText style={styles.muted}>
                {describeTarget(next.target)} · {describeRhythm(next.steps)}
              </AppText>
              {setup ? <AppText style={[styles.muted, styles.centerText]}>{setup}</AppText> : null}
            </Centered>
            <Button title="Pause" variant="onPine" onPress={actions.pause} />
          </View>
        );
      }
      const settling = view.purpose === 'settle';
      return (
        <View style={styles.fill}>
          <TopBar
            left={{ label: 'Cancel', onPress: settling ? actions.cancel : actions.cancelResume }}
            right={settling ? 'Getting ready' : 'Resuming'}
          />
          <Centered>
            <AppText variant="countdown" style={styles.bigCount} maxFontSizeMultiplier={1.4} accessibilityLabel={`${view.seconds} seconds`}>
              {view.seconds}
            </AppText>
            <AppText variant="phase" accessibilityRole="header">
              {settling ? 'Settle in.' : 'Ready when you are.'}
            </AppText>
            <AppText style={styles.muted}>
              {settling
                ? quickStart
                  ? 'Started from your Home Screen.'
                  : 'Your practice starts in a moment.'
                : `Restarting ${view.resumeStep}.`}
            </AppText>
            {settling && showLockTip ? <AppText style={styles.muted}>You can lock your phone. The voice keeps guiding.</AppText> : null}
          </Centered>
        </View>
      );
    }

    case 'running': {
      const { position } = view;
      const practice = practiceOf(view.part);
      const roundsTarget = 'rounds' in practice.target;
      const step = practice.steps[position.step.index];
      const activeSteps = practice.steps.filter((s) => s.seconds > 0);
      const stepNumber = practice.steps.slice(0, position.step.index + 1).filter((s) => s.seconds > 0).length;
      // Half-second rhythms and gradual slowing show a ring instead of whole-second counts.
      const seconds = position.step.durationMs / 1000;
      const halfSeconds = !!practice.slowing || practice.steps.some((s) => !Number.isInteger(s.seconds));
      const count = halfSeconds ? null : guideCount(position.step.durationMs, position.step.elapsedMs, countingAloud);
      const route = routeLabel(step);
      const caption = captionFor(practice, position.step.index) ?? [practice.name, subtitleOf(practice)].filter(Boolean).join(' · ');
      const remaining = roundsTarget
        ? `${position.roundsLeft} ${position.roundsLeft === 1 ? 'round' : 'rounds'} left · ${formatClock(position.remainingMs)}`
        : `${formatClock(position.remainingMs)} remaining`;
      return (
        <View style={styles.fill}>
          <TopBar left={{ label: 'End', onPress: actions.askToEnd }} right={remaining} />
          <AppText variant="label" style={styles.progress}>
            {routine ? `${practice.name} · ` : ''}Round {position.roundNumber} of {rounds[view.part]} · Step {stepNumber} of {activeSteps.length}
          </AppText>
          <View style={styles.center}>
            {step.side ? <SideIndicator open={step.side} /> : null}
            <BreathingGuide
              kind={step.kind}
              hum={step.cue === 'hum' || step.cue === 'om'}
              stepKey={view.stepKey}
              durationMs={position.step.durationMs}
              elapsedMs={position.step.elapsedMs}
              count={count}
              frozen={false}
              reducedMotion={reducedMotion}
              size={guideSize}
              progress={1 - position.remainingMs / durations[view.part]}
            />
            <AppText variant="phase" accessibilityRole="header" style={styles.centerText}>
              {stepLabel(step)}
            </AppText>
            {route ? <AppText variant="bodyStrong" style={[styles.centerText, styles.route]}>{route}</AppText> : null}
            <AppText style={[styles.centerText, styles.muted]}>{halfSeconds ? `${caption} ${seconds} seconds.` : caption}</AppText>
          </View>
          <Button title="Pause" variant="onPine" onPress={actions.pause} />
        </View>
      );
    }

    case 'paused':
      if (view.confirmingEnd) {
        return (
          <View style={styles.fill}>
            <TopBar right="Practice paused" />
            <Centered>
              <AppText variant="phase" accessibilityRole="header">
                End this practice?
              </AppText>
              <AppText style={styles.muted}>Your time so far will stay in History as “Ended early.”</AppText>
            </Centered>
            <View style={styles.actions}>
              <Button title="Keep breathing" variant="onPine" onPress={actions.keepBreathing} />
              <Button title="End session" variant="onPineQuiet" onPress={actions.endSession} />
            </View>
          </View>
        );
      }
      return (
        <View style={styles.fill}>
          <TopBar left={{ label: 'End', onPress: actions.askToEnd }} right="Paused" />
          <Centered>
            <AppText variant="phase" style={styles.pauseMark} importantForAccessibility="no">
              Ⅱ
            </AppText>
            <AppText variant="phase" accessibilityRole="header">
              {PAUSE_TITLE[view.reason]}
            </AppText>
            <AppText style={styles.muted}>
              {view.reason === 'user'
                ? 'Your practice is paused.'
                : `Your practice is waiting: round ${view.roundNumber} of ${view.rounds}, ${formatClock(view.remainingMs)} left.`}
            </AppText>
            <AppText style={styles.muted}>Resume starts {view.resumeStep} again after a three-second countdown.</AppText>
          </Centered>
          <Button title="Resume" variant="onPine" onPress={actions.resume} />
        </View>
      );

    default:
      return null;
  }
}

function TopBar({ left, right }: { left?: { label: string; onPress: () => void }; right: string }) {
  return (
    <View style={styles.topBar}>
      {left ? (
        <Pressable onPress={left.onPress} accessibilityRole="button" style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}>
          <AppText variant="control" style={styles.topButtonText}>
            {left.label}
          </AppText>
        </Pressable>
      ) : (
        <View />
      )}
      <AppText variant="label" style={styles.topRight}>
        {right}
      </AppText>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={[styles.center, styles.centerGap]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.practiceBackground },
  fill: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.ms },
  centerGap: { gap: spacing.md, paddingHorizontal: spacing.sm },
  centerText: { textAlign: 'center' },
  topBar: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  topButton: { minHeight: touchTarget, minWidth: touchTarget, justifyContent: 'center' },
  topButtonText: { color: colors.practiceText },
  topRight: { color: colors.practiceTextMuted, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  progress: { color: colors.practiceTextMuted, textAlign: 'center', fontVariant: ['tabular-nums'] },
  muted: { color: colors.practiceTextMuted, textAlign: 'center' },
  route: { color: colors.practiceText },
  bigCount: { color: colors.practiceText },
  pauseMark: { color: colors.practiceTextMuted },
  introBody: { flex: 1, justifyContent: 'center', gap: spacing.md },
  caption: { color: colors.practiceText, fontSize: 20, lineHeight: 30 },
  captionPast: { color: colors.practiceTextMuted },
  actions: { gap: spacing.ms },
  pressed: { opacity: 0.7 },
});
