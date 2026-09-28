/**
 * Runs a practice or a routine: introduction, settle, guidance, routine
 * transitions, pauses, and the end.
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
import { planStepAt } from '../breathing/rhythm';
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
  segmentEndMs,
  settle,
  totals,
  type PartResult,
  type PauseReason,
  type Position,
  type SessionPlan,
  type SessionState,
} from '../breathing/session';
import { buildRunSchedule, roundLine, type CueSettings } from '../breathing/timeline';
import type { PartRecord, RecordSource, SessionRecord } from '../history/repository';
import type { Preferences } from '../settings/preferences';
import { newId } from '../storage/db';
import { techniqueOf } from './practice';
import type { PracticeRun } from './run';

const TICK_MS = 50;
const KEEP_AWAKE_TAG = 'viram-practice';

export type SessionView =
  | { kind: 'loading' }
  | { kind: 'intro'; lines: string[]; line: number; remainingMs: number }
  | { kind: 'countdown'; purpose: 'settle' | 'resume' | 'transition'; part: number; seconds: number; resumeStep: string }
  | { kind: 'running'; part: number; position: Position; stepKey: string }
  | {
      kind: 'paused';
      part: number;
      reason: PauseReason;
      confirmingEnd: boolean;
      roundNumber: number;
      rounds: number;
      remainingMs: number;
      resumeStep: string;
    }
  | { kind: 'finished'; record: SessionRecord }
  | { kind: 'cancelled' };

interface Options {
  run: PracticeRun;
  preferences: Preferences;
  quickStart: boolean;
  /** Night practice: a soft completion cue (FR-23). */
  night: boolean;
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

/** The saved record: one practice, or a routine with a snapshot of every practice reached. */
function buildRecord(
  run: PracticeRun,
  plans: readonly SessionPlan[],
  result: { outcome: 'completed' | 'ended'; parts: PartResult[] },
  meta: { id: string; startedAt: number; cueMode: SessionRecord['cueMode']; haptics: boolean },
): SessionRecord {
  const first = run.parts[0];
  const single = run.parts.length === 1;
  const source: RecordSource = single
    ? first.source
    : { kind: 'routine', id: run.routineId ?? (run.program ? `program:${run.program.programId}` : 'unsaved') };
  const parts: PartRecord[] = result.parts.map((r, i) => ({
    name: run.parts[i].name,
    techniqueId: run.parts[i].techniqueId,
    steps: run.parts[i].steps,
    target: run.parts[i].target,
    activeMs: r.activeMs,
    completedRounds: r.completedRounds,
    breathsPerMinute: plans[i].breathsPerMinute,
    outcome: r.outcome,
  }));
  return {
    id: meta.id,
    startedAt: meta.startedAt,
    ...totals(result.parts),
    source,
    techniqueId: single ? first.techniqueId : null,
    name: run.name,
    steps: first.steps,
    target: first.target,
    breathsPerMinute: plans[0].breathsPerMinute,
    slowing: single ? (first.slowing ?? null) : null,
    outcome: result.outcome,
    cueMode: meta.cueMode,
    haptics: meta.haptics,
    parts: single ? null : parts,
    program: run.program ? { id: run.program.programId, name: run.program.programName, session: run.program.session } : null,
    health: 'none',
  };
}

export function usePracticeSession({ run, preferences, quickStart, night, onIntroHeard }: Options) {
  // Settings are fixed for the length of a practice.
  const [settings] = useState(() => ({
    cues: {
      mode: preferences.cueMode,
      toneSet: preferences.toneSet,
      haptics: preferences.haptics ? preferences.hapticStrength : null,
      softFinish: night,
    } satisfies CueSettings,
    volume: preferences.cueVolume,
    mixWithOthers: preferences.otherAudio === 'alongside',
  }));
  const [plans] = useState(() => run.parts.map((p) => sessionPlan(p.steps, p.target, p.slowing ?? null)));
  const names = run.parts.map((p) => p.name);
  // Decided once per run, like the settings. Only the first practice is introduced.
  const [intro] = useState(() => {
    const technique = techniqueOf(run.parts[0]);
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
    (position: Position) => roundLine(position.roundNumber, plans[position.part].rounds, position.remainingMs),
    [plans],
  );

  const stepLabelAt = useCallback(
    (part: number, planMs: number) => stepLabel(plans[part].steps[planStepAt(plans[part], planMs).index]),
    [plans],
  );

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
      const position = readPosition(plans, state.segment, clock);
      if (position.lead) {
        next = { kind: 'countdown', purpose: position.lead, part: position.part, seconds: position.countdown, resumeStep: stepLabelAt(position.part, position.planMs) };
        key = `countdown|${position.part}|${position.lead}|${position.countdown}`;
      } else {
        const stepKey = `${position.part}|${state.segment.startPlanMs}|${position.step.startMs}`;
        next = { kind: 'running', part: position.part, position, stepKey };
        key = `running|${stepKey}|${Math.ceil((position.step.durationMs - position.step.elapsedMs) / 1000)}|${Math.round(position.remainingMs / 1000)}`;
      }
    } else if (state.status === 'paused') {
      const plan = plans[state.part];
      next = {
        kind: 'paused',
        part: state.part,
        reason: state.reason,
        confirmingEnd: state.confirmingEnd,
        roundNumber: planStepAt(plan, state.resumePlanMs).round + 1,
        rounds: plan.rounds,
        remainingMs: plan.durationMs - state.resumePlanMs,
        resumeStep: stepLabelAt(state.part, state.resumePlanMs),
      };
      key = `paused|${state.part}|${state.reason}|${state.confirmingEnd}`;
    } else if (state.status === 'finished') {
      next = {
        kind: 'finished',
        record: buildRecord(run, plans, state, {
          id: recordRef.current.id,
          startedAt: recordRef.current.startedAt,
          cueMode: settings.cues.mode,
          haptics: settings.cues.haptics !== null,
        }),
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
  }, [intro, plans, run, settings, stepLabelAt]);

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
    (state: SessionState) => {
      if (state.status !== 'active') return;
      const { segment } = state;
      const schedule = buildRunSchedule(plans, segment, settings.cues, guide.clipLength, names);
      markSegment(segment.purpose === 'settle' ? 'Guidance started' : `Resumed ${names[segment.part]} from plan ${formatClock(segment.startPlanMs)}`);
      guide.startSegment(schedule, {
        volume: settings.volume,
        mixWithOthers: settings.mixWithOthers,
        title: run.name,
        subtitle: 'Getting ready',
      });
    },
    // names derive from run, which is fixed for the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans, run.name, settings],
  );

  const beginSettle = useCallback(() => {
    if (intro) onIntroHeard(intro.id);
    recordRef.current.startedAt = Date.now();
    beginTimingLog(
      run.name,
      `${Platform.OS} · ${settings.cues.mode} · ${settings.mixWithOthers ? 'play along' : 'pause other audio'} · ${formatClock(segmentEndMs(plans, { purpose: 'settle', part: 0, startPlanMs: 0, activeBeforeMs: 0 }) - LEAD_MS)} planned`,
    );
    const state = settle();
    transition(state);
    startGuidance(state);
  }, [intro, onIntroHeard, plans, run.name, settings, startGuidance, transition]);

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
            { volume: settings.volume, mixWithOthers: settings.mixWithOthers, title: run.name, subtitle: 'Introduction' },
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
        transition({ status: 'paused', reason, part: 0, resumePlanMs: 0, activeMs: 0, confirmingEnd: false, done: [] });
        return;
      }
      if (state?.status !== 'active') return;
      const clock = guide.pause();
      const next = pause(plans, state, Math.max(0, clock), reason);
      transition(next);
      if (next.status === 'paused') {
        const plan = plans[next.part];
        const round = planStepAt(plan, next.resumePlanMs).round + 1;
        guide.setNowPlaying(run.name, `Paused · round ${round} of ${plan.rounds}, ${formatClock(plan.durationMs - next.resumePlanMs)} left`);
      }
    },
    [plans, run.name, transition],
  );

  const resumePractice = useCallback(() => {
    const state = stateRef.current;
    if (state?.status !== 'paused') return;
    const next = resume(state);
    // A pause during the introduction resumes into the first guidance.
    if (recordRef.current.startedAt === 0) recordRef.current.startedAt = Date.now();
    transition(next);
    startGuidance(next);
  }, [startGuidance, transition]);

  const askToEnd = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    if (state.status === 'active') {
      const clock = guide.pause();
      transition(requestEnd(plans, state, Math.max(0, clock)));
    } else if (state.status === 'paused') {
      transition({ ...state, confirmingEnd: true });
    }
  }, [plans, transition]);

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
      transition(endEarly(plans, pause(plans, state, Math.max(0, clock), 'user')));
    } else if (state?.status === 'paused') {
      transition(endEarly(plans, state));
    }
    guide.stop();
  }, [plans, transition]);

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
    transition({
      status: 'paused',
      reason: 'user',
      part: state.segment.part,
      resumePlanMs: state.segment.startPlanMs,
      activeMs: state.segment.activeBeforeMs,
      confirmingEnd: false,
      done: state.done,
    });
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
        if (clock < 0 || readPosition(plans, state.segment, clock).done) {
          transition(complete(plans, state));
          return;
        }
      }
      render();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [beginSettle, intro, plans, render, transition]);

  // ——— Interruptions, lock-screen controls, and locking in Silent ———

  useEffect(
    () =>
      guide.subscribe({
        onInterruption: (reason) => {
          // The guide already froze its clock at the interruption.
          const state = stateRef.current;
          if (state?.status === 'intro') return pauseFor(reason);
          if (state?.status !== 'active') return;
          transition(pause(plans, state, Math.max(0, guide.positionMs()), reason));
        },
        // Events still arrive while Android pauses JS timers on a locked screen,
        // so a practice that ends locked is completed and saved right away.
        onSegmentEnded: () => {
          const state = stateRef.current;
          if (state?.status === 'active') transition(complete(plans, state));
        },
        onRemoteCommand: (command) => {
          if (command === 'pause') pauseFor('lockScreen');
          else if (command === 'play') resumePractice();
          else endSession();
        },
      }),
    [endSession, pauseFor, plans, resumePractice, transition],
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
      const step = plans[view.part].steps[view.position.step.index];
      message = `${stepLabel(step)}, ${step.seconds} seconds`;
      if (announced.current !== view.stepKey) {
        announced.current = view.stepKey;
        AccessibilityInfo.announceForAccessibility(message);
      }
    } else if (view.kind === 'paused' && !view.confirmingEnd && announced.current !== 'paused') {
      announced.current = 'paused';
      AccessibilityInfo.announceForAccessibility('Practice paused');
    } else if (view.kind === 'countdown' && announced.current !== `countdown-${view.part}-${view.purpose}`) {
      announced.current = `countdown-${view.part}-${view.purpose}`;
      const message = {
        settle: 'Settle in. Starting in 3 seconds',
        resume: `Resuming in 3 seconds with ${view.resumeStep}`,
        transition: `Up next, ${names[view.part]}. Starting in 5 seconds`,
      }[view.purpose];
      AccessibilityInfo.announceForAccessibility(message);
    }
    // names derive from run, which is fixed for the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, view]);

  // Keep the lock screen's round line current while the app is open.
  useEffect(() => {
    if (view.kind === 'running') guide.setNowPlaying(run.name, subtitleNow(view.position));
    // Only at round starts; the native timeline updates it while locked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind === 'running' ? `${view.part}|${view.position.roundNumber}` : '']);

  return {
    plans,
    view,
    hasIntro: intro !== null,
    actions: { pause: () => pauseFor('user'), resume: resumePractice, askToEnd, keepBreathing, endSession, skipIntro, cancel, cancelResume, dismissEnd: () => {
      const state = stateRef.current;
      if (state?.status === 'paused') transition(dismissEnd(state));
    } },
  };
}
