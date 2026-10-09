import { LIBRARY } from '../../content/library';
import { COMFORT_LINE } from '../../content/safety';
import { HOLD_CAUTION } from '../../practice/caution';
import { customPractice, practiceFromTechnique, quickBox } from '../../practice/practice';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { companionContext, MAX_WATCH_PRACTICES, recordFromWatch, watchPractice, type WatchSession } from '../companion';

const offer = (practice: ReturnType<typeof quickBox>) => ({ practice });

const technique = (id: string) => practiceFromTechnique(LIBRARY.find((t) => t.id === id)!);
const NOW = Date.UTC(2026, 9, 7, 12);

function session(change: Partial<WatchSession> = {}): WatchSession {
  return {
    v: 1,
    id: '6F9619FF-8B86-D011-B42D-00C04FC964FF',
    startedAt: NOW - 10 * 60_000,
    activeMs: 300_000,
    completedRounds: 15,
    outcome: 'completed',
    practiceJson: JSON.stringify(technique('nadi-shodhana')),
    ...change,
  };
}

describe('watch companion', () => {
  it('sends each practice with labels, its plan, and itself to echo back', () => {
    const p = watchPractice(offer(technique('nadi-shodhana')));
    expect(p.key).toBe('technique:nadi-shodhana inhale4,exhale6,inhale4,exhale6 m5');
    expect(p.detail).toBe('in 4 · out 6, each side · 5 min');
    expect(p.steps.map((s) => s.label)).toEqual(['Inhale left', 'Exhale right', 'Inhale right', 'Exhale left']);
    expect(p.rounds).toBe(15);
    expect(p.durationMs).toBe(300_000);
    expect(JSON.parse(p.practiceJson).techniqueId).toBe('nadi-shodhana');
  });

  it('carries the phone’s caution, following the rhythm as practised (content review F10)', () => {
    const caution = (practice: ReturnType<typeof quickBox>) => watchPractice(offer(practice)).caution;
    expect(caution(technique('4-7-8'))).toBe(LIBRARY.find((t) => t.id === '4-7-8')!.guidance.takeCareShort);
    // Holds added to a hold-free practice, or in a rhythm of one's own, get the hold caution.
    const nadi = technique('nadi-shodhana');
    expect(caution({ ...nadi, steps: [nadi.steps[0], { kind: 'hold', seconds: 4 }, ...nadi.steps.slice(1)] })).toBe(HOLD_CAUTION);
    expect(caution(customPractice())).toBe(HOLD_CAUTION);
    expect(caution({ ...customPractice(), steps: customPractice().steps.map((s) => (s.kind === 'hold' || s.kind === 'rest' ? { ...s, seconds: 0 } : s)) })).toBe(COMFORT_LINE);
  });

  it('drops only exact repeats, keeping practices in order with the haptic settings', () => {
    // Box breathing is the library's Sama Vritti; an adjusted Sama Vritti is not (QA W05).
    const adjusted = { ...technique('sama-vritti'), steps: technique('sama-vritti').steps.map((s) => ({ ...s, seconds: 6 })), target: { minutes: 20 } };
    const many = [adjusted, quickBox(), technique('sama-vritti'), customPractice(), customPractice(), ...LIBRARY.map((t) => practiceFromTechnique(t))].map(offer);
    const context = companionContext(many, DEFAULT_PREFERENCES, NOW);
    expect(context.practices.map((p) => p.detail).slice(0, 3)).toEqual(['6 · 6 · 6 · 6 · 20 min', '4 · 4 · 4 · 4 · 5 min', '4 · 4 · 4 · 4 · 5 min']);
    expect(context.practices.map((p) => p.name).slice(0, 3)).toEqual(['Sama Vritti', 'Sama Vritti', 'Custom rhythm']);
    // Every other library practice, once.
    expect(context.practices).toHaveLength(3 + LIBRARY.length - 1);
    expect(new Set(context.practices.map((p) => p.key)).size).toBe(context.practices.length);
    expect(context.haptics).toEqual({ style: 'marks', phases: { inhale: true, hold: true, exhale: true, rest: true } });
  });

  it('stops at its limit, still small enough for WatchConnectivity and a Wear OS data item', () => {
    const rhythms = Array.from({ length: 40 }, (_, i) => ({ ...customPractice(), name: `Rhythm ${i + 1}`, source: { kind: 'rhythm' as const, id: `r${i}` } }));
    const context = companionContext([...rhythms, ...LIBRARY.map(practiceFromTechnique)].map(offer), DEFAULT_PREFERENCES, NOW);
    expect(context.practices).toHaveLength(MAX_WATCH_PRACTICES);
    expect(JSON.stringify(context).length).toBeLessThan(48_000);
  });

  it('turns a watch session into a silent, haptic record', () => {
    const record = recordFromWatch(session(), NOW)!;
    expect(record).toMatchObject({
      id: '6f9619ff-8b86-d011-b42d-00c04fc964ff',
      name: 'Nadi Shodhana',
      techniqueId: 'nadi-shodhana',
      completedRounds: 15,
      outcome: 'completed',
      cueMode: 'silent',
      haptics: true,
      parts: null,
      program: null,
      health: 'none',
    });
    expect(record.breathsPerMinute).toBe(6);
  });

  it('keeps a program session’s tag for the phone to check', () => {
    const p = watchPractice({ practice: technique('sama-vritti'), program: { id: 'foundations', name: 'Pranayama Foundations', session: 1 } });
    expect(p.detail).toBe('Session 1 · 4 · 4 · 4 · 4 · 5 min');
    expect(p.key).toMatch(/^program:foundations:1 /);
    const record = recordFromWatch(session({ completedRounds: 19, activeMs: 304_000, practiceJson: p.practiceJson }), NOW)!;
    expect(record.program).toEqual({ id: 'foundations', name: 'Pranayama Foundations', session: 1 });
    expect(recordFromWatch(session({ practiceJson: JSON.stringify({ ...technique('nadi-shodhana'), program: { id: 'x' } }) }), NOW)!.program).toBeNull();
  });

  it('accepts an ended practice whose time covers its rounds', () => {
    expect(recordFromWatch(session({ outcome: 'ended', completedRounds: 2, activeMs: 45_000 }), NOW)).toMatchObject({ outcome: 'ended', completedRounds: 2 });
    expect(recordFromWatch(session({ outcome: 'ended', completedRounds: 0, activeMs: 1000 }), NOW)).toMatchObject({ completedRounds: 0 });
  });

  it.each([
    ['wrong version', { v: 2 as 1 }],
    ['bad id', { id: 'x' }],
    ['no time', { activeMs: 0 }],
    ['three hours', { activeMs: 3 * 60 * 60_000 + 1 }],
    ['far future', { startedAt: NOW + 2 * 24 * 60 * 60_000 }],
    ['negative rounds', { completedRounds: -1 }],
    ['more rounds than planned', { completedRounds: 16 }],
    // Internally inconsistent (QA W09): a completed practice ran every round, for the plan's time.
    ['completed with no rounds', { activeMs: 1, completedRounds: 0 }],
    ['completed short of its rounds', { completedRounds: 14 }],
    ['completed in less than the plan’s time', { activeMs: 200_000 }],
    ['ended with every round done', { outcome: 'ended' as const, completedRounds: 15 }],
    ['ended with rounds it had no time for', { outcome: 'ended' as const, completedRounds: 10, activeMs: 60_000 }],
    ['bad outcome', { outcome: 'won' as 'ended' }],
    ['not JSON', { practiceJson: '{' }],
    ['out-of-bounds practice', { practiceJson: JSON.stringify({ ...technique('sama-vritti'), steps: [{ kind: 'inhale', seconds: 99 }] }) }],
    ['unknown technique', { practiceJson: JSON.stringify({ ...technique('sama-vritti'), techniqueId: 'kapalabhati', source: { kind: 'technique', id: 'kapalabhati' } }) }],
  ])('rejects %s', (_, change) => {
    expect(recordFromWatch(session(change), NOW)).toBeNull();
  });
});
