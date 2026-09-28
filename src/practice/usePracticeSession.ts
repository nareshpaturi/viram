/**
 * Runs one practice: introduction, settle, guidance, pauses, and the end.
 *
 * The session state machine (src/breathing/session.ts) decides; the guide's
 * audio clock supplies time; this hook connects them to the app lifecycle,
 * interruptions, lock-screen controls, and screen-reader announcements.
 * Nothing is saved here: the completion screen saves the finished record.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as guide from '../audio/guide';
import { CLIP_MS } from '../audio/manifest.generated';
import { beginTimingLog, markSegment, markTiming } from '../audio/timingLog';
import { formatClock, stepLabel } from '../breathing/describe';
import {
  LEAD_MS,
  complete,
  dismissEnd,
  endEarly,
  initialState,
  pause,
  readPosition,
  requestEnd,
  resume,
  sessionPlan,
  settle,
  type PauseReason,
  type Position,
  type SessionState,
} from '../breathing/session';
import { buildSchedule, roundLine, type CueSettings } from '../breathing/timeline';
import type { SessionRecord } from '../history/repository';
import type { Preferences } from '../settings/preferences';
import { newId } from '../storage/db';
import { techniqueOf, type Practice } from './practice';

const TICK_MS = 50;
const KEEP_AWAKE_TAG = 'viram-practice';

export type SessionView =
  | { kind: 'loading' }
  | { kind: 'intro'; lines: string[]; line: number; remainingMs: number }
  | { kind: 'countdown'; purpose: 'settle' | 'resume'; seconds: number; resumeStep: string }
  | { kind: 'running'; position: Position; stepKey: string }
  | { kind: 'paused'; reason: PauseReason; confirmingEnd: boolean; roundNumber: number; rounds: number; remainingMs: number; resumeStep: string }
  | { kind: 'finished'; record: SessionRecord }
  | { kind: 'cancelled' };

interface Options {
  practice: Practice;
  preferences: Preferences;
  quickStart: boolean;
  onIntroHeard: (techniqueId: string) => void;
}

/** Caption line for an introduction position, spread by word count. */
function introLine(lines: string[], progress: number): number {
  const words = lines.map((l) => l.split(/\s+/).length);
  const total = words.reduce((a, b) => a + b, 0);
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    seen += words[i];
    if (progress < seen / total) return i;
  }
  return lines.length - 1;
}

export function usePracticeSession({ practice, preferences, quickStart, onIntroHeard }: Options) {
  // Settings are fixed for the length of a practice.
  const [settings] = useState(() => ({
    cues: {
      mode: preferences.cueMode,
      toneSet: preferences.toneSet,
      haptics: preferences.haptics ? preferences.hapticStrength : null,
    } satisfies CueSettings,
    volume: preferences.cueVolume,
    mixWithOthers: preferences.otherAudio === 'alongside',
  }));
  const [plan] = useState(() => sessionPlan(practice.steps, practice.target));
  // Decided once per practice, like the settings.
  const [intro] = useState(() => {
    const technique = techniqueOf(practice);
    const wanted =
      !quickStart &&
      technique &&
      (preferences.introductions === 'always' ||
        (preferences.introductions === 'first' && !preferences.introductionsHeard.includes(technique.id)));
    return wanted ? { id: technique.id, clip: technique.guidance.introduction.clip, lines: technique.guidance.introduction.lines } : null;
  });

  const stateRef = useRef<SessionState | null>(null);
  const recordRef = useRef({ id: newId(), startedAt: 0 });
  const [view, setView] = useState<SessionView>({ kind: 'loading' });
  const viewKey = useRef('');
  const announced = useRef('');

  const subtitleNow = useCallback(
    (position: Position) => roundLine(position.roundNumber, plan.rounds, position.remainingMs),
    [plan.rounds],
  );

  const resumeStepAt = useCallback((planMs: number) => {
    const index = readPosition(plan, { purpose: 'resume', startPlanMs: planMs, activeBeforeMs: 0 }, LEAD_MS).step.index;
    return stepLabel(plan.steps[index]);
  }, [plan]);

  // ——— Deriving the view from (state, clock) ———

  const render = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    let next: SessionView;
    let key: string;
    if (state.status === 'intro' && intro) {
      const clip = CLIP_MS[intro.clip] ?? 0;
      const clock = Math.max(0, guide.positionMs());
      const line = introLine(intro.lines, clock / Math.max(1, clip));
      next = { kind: 'intro', lines: intro.lines, line, remainingMs: Math.max(0, clip - clock) };
      key = `intro|${line}|${Math.ceil(next.remainingMs / 1000)}`;
    } else if (state.status === 'active') {
      const clock = Math.max(0, guide.positionMs());
      const position = readPosition(plan, state.segment, clock);
      if (position.countdown > 0) {
        next = { kind: 'countdown', purpose: state.segment.purpose, seconds: position.countdown, resumeStep: resumeStepAt(state.segment.startPlanMs) };
        key = `countdown|${state.segment.purpose}|${position.countdown}`;
      } else {
        const stepKey = `${state.segment.startPlanMs}|${position.step.startMs}`;
        next = { kind: 'running', position, stepKey };
        key = `running|${stepKey}|${Math.ceil((position.step.durationMs - position.step.elapsedMs) / 1000)}|${Math.round(position.remainingMs / 1000)}`;
      }
    } else if (state.status === 'paused') {
      const roundNumber = Math.floor(state.resumePlanMs / plan.roundMs) + 1;
      next = {
        kind: 'paused',
        reason: state.reason,
        confirmingEnd: state.confirmingEnd,
        roundNumber,
        rounds: plan.rounds,
        remainingMs: plan.durationMs - state.resumePlanMs,
        resumeStep: resumeStepAt(state.resumePlanMs),
      };
      key = `paused|${state.reason}|${state.confirmingEnd}`;
    } else if (state.status === 'finished') {
      next = {
        kind: 'finished',
        record: {
          id: recordRef.current.id,
          startedAt: recordRef.current.startedAt,
          activeMs: state.activeMs,
          source: practice.source,
          techniqueId: practice.techniqueId,
          name: practice.name,
          steps: practice.steps,
          target: practice.target,
          completedRounds: state.completedRounds,
          breathsPerMinute: plan.breathsPerMinute,
          outcome: state.outcome,
          cueMode: settings.cues.mode,
          haptics: settings.cues.haptics !== null,
        },
      };
      key = 'finished';
    } else {
      next = { kind: 'cancelled' };
      key = 'cancelled';
    }
    if (key !== viewKey.current) {
      viewKey.current = key;
      setView(next);
    }
  }, [intro, plan, practice, resumeStepAt, settings]);

  const transition = useCallback(
    (state: SessionState) => {
      if (state.status === 'paused' && stateRef.current?.status !== 'paused') markTiming(`Paused: ${state.reason}`);
      if (state.status === 'finished') markTiming(state.outcome === 'completed' ? 'Completed' : 'Ended early');
      stateRef.current = state;
      render();
    },
    [render],
  );

  // ——— Segments ———

  const startGuidance = useCallback(
    (startPlanMs: number) => {
      const schedule = buildSchedule(plan, startPlanMs, settings.cues, guide.clipLength);
      markSegment(startPlanMs === 0 ? 'Guidance started' : `Resumed from plan ${formatClock(startPlanMs)}`);
      guide.startSegment(schedule, {
        volume: settings.volume,
        mixWithOthers: settings.mixWithOthers,
        title: practice.name,
        subtitle: 'Getting ready',
      });
    },
    [plan, practice.name, settings],
  );

  const beginSettle = useCallback(() => {
    if (intro) onIntroHeard(intro.id);
    recordRef.current.startedAt = Date.now();
    beginTimingLog(
      practice.name,
      `${Platform.OS} · ${settings.cues.mode} · ${settings.mixWithOthers ? 'play along' : 'pause other audio'} · ${formatClock(plan.durationMs)} planned`,
    );
    transition(settle());
    startGuidance(0);
  }, [intro, onIntroHeard, plan.durationMs, practice.name, settings, startGuidance, transition]);

  // Load sounds, then introduce or settle.
  useEffect(() => {
    let cancelled = false;
    const sounds = guide.practiceSounds(settings.cues.toneSet);
    guide
      .prepareSounds(intro ? [...sounds, `voice.${intro.clip}`] : sounds)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        const introPlayable = intro && guide.clipLength(intro.clip) !== undefined;
        if (introPlayable) {
          transition(initialState(true));
          guide.startSegment(
            { cues: [{ atMs: 0, sound: `voice.${intro.clip}`, haptic: null, nowPlaying: null }], endMs: CLIP_MS[intro.clip] },
            { volume: settings.volume, mixWithOthers: settings.mixWithOthers, title: practice.name, subtitle: 'Introduction' },
          );
        } else {
          beginSettle();
        }
      });
    return () => {
      cancelled = true;
    };
    // Runs once per practice screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— Actions ———

  const pauseFor = useCallback(
    (reason: PauseReason) => {
      const state = stateRef.current;
      // Interrupted during the introduction: pause before any practice time; Resume settles.
      if (state?.status === 'intro') {
        guide.stop();
        transition({ status: 'paused', reason, resumePlanMs: 0, activeMs: 0, confirmingEnd: false });
        return;
      }
      if (state?.status !== 'active') return;
      const clock = guide.pause();
      const next = pause(plan, state, Math.max(0, clock), reason);
      transition(next);
      if (next.status === 'paused') {
        const round = Math.floor(next.resumePlanMs / plan.roundMs) + 1;
        guide.setNowPlaying(practice.name, `Paused · round ${round} of ${plan.rounds}, ${formatClock(plan.durationMs - next.resumePlanMs)} left`);
      }
    },
    [plan, practice.name, transition],
  );

  const resumePractice = useCallback(() => {
    const state = stateRef.current;
    if (state?.status !== 'paused') return;
    const next = resume(state);
    // A pause during the introduction resumes into the first guidance.
    if (recordRef.current.startedAt === 0) recordRef.current.startedAt = Date.now();
    transition(next);
    if (next.status === 'active') startGuidance(next.segment.startPlanMs);
  }, [startGuidance, transition]);

  const askToEnd = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    if (state.status === 'active') {
      const clock = guide.pause();
      transition(requestEnd(plan, state, Math.max(0, clock)));
    } else if (state.status === 'paused') {
      transition({ ...state, confirmingEnd: true });
    }
  }, [plan, transition]);

  const keepBreathing = useCallback(() => {
    const state = stateRef.current;
    if (state?.status === 'paused') transition(dismissEnd(state));
    resumePractice();
  }, [resumePractice, transition]);

  const endSession = useCallback(() => {
    const state = stateRef.current;
    if (state?.status === 'intro') {
      // Nothing practiced yet: ending is cancelling, with no record.
      guide.stop();
      transition({ status: 'cancelled' });
      return;
    }
    if (state?.status === 'active') {
      const clock = guide.pause();
      transition(endEarly(plan, pause(plan, state, Math.max(0, clock), 'user')));
    } else if (state?.status === 'paused') {
      transition(endEarly(plan, state));
    }
    guide.stop();
  }, [plan, transition]);

  const skipIntro = useCallback(() => {
    if (stateRef.current?.status !== 'intro') return;
    guide.stop();
    beginSettle();
  }, [beginSettle]);

  /** Cancel before any practice time: returns without a record. */
  const cancel = useCallback(() => {
    guide.stop();
    transition({ status: 'cancelled' });
  }, [transition]);

  /** From the resume countdown: back to paused, nothing lost. */
  const cancelResume = useCallback(() => {
    const state = stateRef.current;
    if (state?.status !== 'active' || state.segment.purpose !== 'resume') return;
    guide.pause();
    transition({ status: 'paused', reason: 'user', resumePlanMs: state.segment.startPlanMs, activeMs: state.segment.activeBeforeMs, confirmingEnd: false });
  }, [transition]);

  // ——— Clock ———

  useEffect(() => {
    const timer = setInterval(() => {
      const state = stateRef.current;
      if (state?.status === 'intro') {
        const clock = guide.positionMs();
        if (clock < 0 || clock >= (intro ? CLIP_MS[intro.clip] ?? 0 : 0) + 400) beginSettle();
      } else if (state?.status === 'active') {
        const clock = guide.positionMs();
        // A released segment (-1) means the guide already played it to the end.
        if (clock < 0 || readPosition(plan, state.segment, clock).done) {
          transition(complete(plan, state));
          return;
        }
      }
      render();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [beginSettle, intro, plan, render, transition]);

  // ——— Interruptions, lock-screen controls, and locking in Silent ———

  useEffect(
    () =>
      guide.subscribe({
        onInterruption: (reason) => {
          // The guide already froze its clock at the interruption.
          const state = stateRef.current;
          if (state?.status === 'intro') return pauseFor(reason);
          if (state?.status !== 'active') return;
          transition(pause(plan, state, Math.max(0, guide.positionMs()), reason));
        },
        // Events still arrive while Android pauses JS timers on a locked screen,
        // so a practice that ends locked is completed and saved right away.
        onSegmentEnded: () => {
          const state = stateRef.current;
          if (state?.status === 'active') transition(complete(plan, state));
        },
        onRemoteCommand: (command) => {
          if (command === 'pause') pauseFor('lockScreen');
          else if (command === 'play') resumePractice();
          else endSession();
        },
      }),
    [endSession, pauseFor, plan, resumePractice, transition],
  );

  useEffect(() => {
    // Silent keeps going locked only where a haptic can still guide: Android with haptics on.
    const pausesOnLock = settings.cues.mode === 'silent' && (Platform.OS === 'ios' || settings.cues.haptics === null);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'background') markTiming('App in background (locked or switched away)');
      if (status === 'active') markTiming('App in foreground');
      if (status === 'background' && pausesOnLock) pauseFor('locked');
      if (status === 'active') render();
    });
    return () => subscription.remove();
  }, [pauseFor, render, settings.cues]);

  // The screen stays on in Silent, or when the person asked for it.
  useEffect(() => {
    if (settings.cues.mode !== 'silent' && !preferences.keepScreenOn) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [preferences.keepScreenOn, settings.cues.mode]);

  // Release audio when leaving: a finished practice lets its completion cue ring out.
  useEffect(
    () => () => {
      if (stateRef.current?.status === 'finished' && stateRef.current.outcome === 'completed') guide.finish();
      else guide.stop();
    },
    [],
  );

  // Screen readers hear each step once, at its boundary: “Inhale left, 4 seconds”.
  useEffect(() => {
    let message = '';
    if (view.kind === 'running') {
      const step = plan.steps[view.position.step.index];
      message = `${stepLabel(step)}, ${step.seconds} seconds`;
      if (announced.current !== view.stepKey) {
        announced.current = view.stepKey;
        AccessibilityInfo.announceForAccessibility(message);
      }
    } else if (view.kind === 'paused' && !view.confirmingEnd && announced.current !== 'paused') {
      announced.current = 'paused';
      AccessibilityInfo.announceForAccessibility('Practice paused');
    } else if (view.kind === 'countdown' && announced.current !== `countdown-${view.purpose}`) {
      announced.current = `countdown-${view.purpose}`;
      AccessibilityInfo.announceForAccessibility(view.purpose === 'settle' ? 'Settle in. Starting in 3 seconds' : `Resuming in 3 seconds with ${view.resumeStep}`);
    }
  }, [plan.steps, view]);

  // Keep the lock screen's round line current while the app is open.
  useEffect(() => {
    if (view.kind === 'running') guide.setNowPlaying(practice.name, subtitleNow(view.position));
    // Only at round starts; the native timeline updates it while locked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind === 'running' ? view.position.roundNumber : 0]);

  return {
    plan,
    view,
    hasIntro: intro !== null,
    actions: { pause: () => pauseFor('user'), resume: resumePractice, askToEnd, keepBreathing, endSession, skipIntro, cancel, cancelResume, dismissEnd: () => {
      const state = stateRef.current;
      if (state?.status === 'paused') transition(dismissEnd(state));
    } },
  };
}
