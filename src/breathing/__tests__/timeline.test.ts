import { LIBRARY } from '../../content/library';
import type { CueId } from '../../content/voice';
import { LEAD_MS, sessionPlan } from '../session';
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
