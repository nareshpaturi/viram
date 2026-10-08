import { LIBRARY } from '../../content/library';
import type { CueId } from '../../content/voice';
import { LEAD_MS, sessionPlan } from '../session';
import type { RhythmStep } from '../rhythm';
import { buildSchedule, type CueSettings } from '../timeline';

const practice = (id: string) => LIBRARY.find((t) => t.id === id)!.practice;
const clips: Partial<Record<CueId, number>> = {
  inhale: 600,
  hold: 500,
  exhale: 600,
  rest: 500,
  hum: 500,
  'inhale-left': 900,
  'inhale-right': 900,
  'exhale-left': 900,
  'exhale-right': 900,
  'inhale-mouth': 1400,
  'exhale-mouth': 1400,
};
const clipMs = (id: CueId) => clips[id];
const voice: CueSettings = { mode: 'voice', toneSet: 'soft-bells', haptics: 'medium' };

describe('buildSchedule', () => {
  it('cues every non-zero boundary after the lead, then completion', () => {
    const plan = sessionPlan(
      [
        { kind: 'inhale', seconds: 4 },
        { kind: 'hold', seconds: 0 },
        { kind: 'exhale', seconds: 6 },
        { kind: 'rest', seconds: 0 },
      ],
      { rounds: 2 },
    );
    const { cues, endMs } = buildSchedule(plan, 0, { ...voice, mode: 'tones' }, clipMs);
    expect(cues.map((c) => [c.atMs, c.sound])).toEqual([
      [LEAD_MS, 'tone.soft-bells.inhale'],
      [LEAD_MS + 4000, 'tone.soft-bells.exhale'],
      [LEAD_MS + 10_000, 'tone.soft-bells.inhale'],
      [LEAD_MS + 14_000, 'tone.soft-bells.exhale'],
      [LEAD_MS + 20_000, 'tone.soft-bells.complete'],
    ]);
    expect(endMs).toBe(LEAD_MS + 20_000);
    expect(cues.every((c) => c.haptic === 'medium')).toBe(true);
  });

  it('speaks sides, hum, and the mouth route on the first round only', () => {
    const nadi = buildSchedule(sessionPlan(practice('nadi-shodhana').steps, { rounds: 1 }), 0, voice, clipMs);
    expect(nadi.cues.slice(0, 4).map((c) => c.sound)).toEqual([
      'voice.inhale-left',
      'voice.exhale-right',
      'voice.inhale-right',
      'voice.exhale-left',
    ]);
    const bhramari = buildSchedule(sessionPlan(practice('bhramari').steps, { rounds: 1 }), 0, voice, clipMs);
    expect(bhramari.cues[1].sound).toBe('voice.hum');
    const sheetali = buildSchedule(sessionPlan(practice('sheetali').steps, { rounds: 2 }), 0, voice, clipMs);
    expect(sheetali.cues.map((c) => c.sound).slice(0, 3)).toEqual(['voice.inhale-mouth', 'voice.exhale', 'voice.inhale']);
  });

  it('plays the tone when a step is shorter than its clip plus 0.2 s, or the clip is missing', () => {
    const steps = [
      { kind: 'inhale' as const, seconds: 1, route: 'mouth' as const },
      { kind: 'exhale' as const, seconds: 1 },
    ];
    const short = buildSchedule(sessionPlan(steps, { rounds: 1 }), 0, voice, clipMs);
    expect(short.cues.map((c) => c.sound).slice(0, 2)).toEqual(['tone.soft-bells.inhale', 'voice.exhale']);
    const missing = buildSchedule(sessionPlan(steps, { rounds: 1 }), 0, voice, () => undefined);
    expect(missing.cues[1].sound).toBe('tone.soft-bells.exhale');
  });

  it('is silent in Silent mode but keeps haptics', () => {
    const { cues } = buildSchedule(sessionPlan(practice('ujjayi').steps, { rounds: 1 }), 0, { ...voice, mode: 'silent' }, clipMs);
    expect(cues.every((c) => c.sound === null && c.haptic === 'medium')).toBe(true);
  });

  it('resumes from the interrupted step', () => {
    const plan = sessionPlan(practice('sama-vritti').steps, { minutes: 1 });
    const { cues, endMs } = buildSchedule(plan, 20_000, { ...voice, haptics: null }, clipMs);
    expect(cues[0]).toEqual({ atMs: LEAD_MS, sound: 'voice.hold', haptic: null, nowPlaying: 'Round 2 of 4 · 0:44 left' });
    expect(cues[1].nowPlaying).toBeNull();
    expect(cues[3].nowPlaying).toBe('Round 3 of 4 · 0:32 left');
    expect(endMs).toBe(LEAD_MS + plan.durationMs - 20_000);
  });
});

describe('counting within steps (FR-19)', () => {
  const counts = (n: number) => Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`count-${i + 2}`, n]));
  const withCounts = (ms: number) => (id: CueId) => ({ ...clips, ...counts(ms) })[id];
  const counting: CueSettings = { ...voice, counting: true };
  const inOut = (inhale: number, exhale: number) =>
    sessionPlan(
      [
        { kind: 'inhale', seconds: inhale },
        { kind: 'exhale', seconds: exhale },
      ],
      { rounds: 1 },
    );

  it('speaks each whole second after the step cue, with no haptic', () => {
    const { cues } = buildSchedule(inOut(4, 6), 0, counting, withCounts(500));
    expect(cues.map((c) => [c.atMs - LEAD_MS, c.sound])).toEqual([
      [0, 'voice.inhale'],
      [1000, 'voice.count-2'],
      [2000, 'voice.count-3'],
      [3000, 'voice.count-4'],
      [4000, 'voice.exhale'],
      [5000, 'voice.count-2'],
      [6000, 'voice.count-3'],
      [7000, 'voice.count-4'],
      [8000, 'voice.count-5'],
      [9000, 'voice.count-6'],
      [10_000, 'tone.soft-bells.complete'],
    ]);
    expect(cues.filter((c) => c.sound?.includes('count')).every((c) => c.haptic === null && c.nowPlaying === null)).toBe(true);
  });

  it('is off by default, in Tones and Silent, and never counts a half second', () => {
    expect(buildSchedule(inOut(4, 6), 0, voice, withCounts(500)).cues).toHaveLength(3);
    expect(buildSchedule(inOut(4, 6), 0, { ...counting, mode: 'tones' }, withCounts(500)).cues).toHaveLength(3);
    const half = buildSchedule(inOut(4.5, 4.5), 0, counting, withCounts(500)).cues.filter((c) => c.sound?.includes('count'));
    expect(half).toHaveLength(6);
  });

  it('stays quiet where a number would overlap the step cue or not fit its second', () => {
    const plan = sessionPlan(practice('nadi-shodhana').steps, { rounds: 1 });
    const long = { ...clips, 'inhale-left': 1300, ...counts(500) };
    const { cues } = buildSchedule(plan, 0, counting, (id) => long[id]);
    // “Inhale left” runs 1.3 s, so the count starts at three.
    expect(cues[1]).toMatchObject({ atMs: LEAD_MS + 2000, sound: 'voice.count-3' });
    expect(buildSchedule(inOut(4, 6), 0, counting, withCounts(900)).cues).toHaveLength(3);
  });
});

describe('per-phase haptic patterns in the schedule', () => {
  const box: RhythmStep[] = [
    { kind: 'inhale', seconds: 4 },
    { kind: 'hold', seconds: 4 },
    { kind: 'exhale', seconds: 4 },
    { kind: 'rest', seconds: 4 },
  ];
  const plan = sessionPlan(box, { rounds: 1 });
  const base = { mode: 'tones' as const, toneSet: 'soft-bells' as const, haptics: 'medium' as const };

  it('gives each step its own pattern, the exhale the longest', () => {
    const cues = buildSchedule(plan, 0, base, () => undefined).cues.slice(0, 4);
    expect(cues.map((c) => c.pulses?.length)).toEqual([2, 1, 1, 1]);
    expect(cues[2].pulses![0].ms).toBeGreaterThan(cues[0].pulses![1].ms);
  });

  it('leaves a phase that is off without any haptic, and no haptics without pulses', () => {
    const cues = buildSchedule(plan, 0, { ...base, hapticPhases: { inhale: true, hold: true, exhale: false, rest: true } }, () => undefined).cues;
    expect(cues[2]).toMatchObject({ haptic: null });
    expect(cues[2].pulses).toBeUndefined();
    const none = buildSchedule(plan, 0, { ...base, haptics: null }, () => undefined).cues;
    expect(none.every((c) => !c.pulses && c.haptic === null)).toBe(true);
  });
});
