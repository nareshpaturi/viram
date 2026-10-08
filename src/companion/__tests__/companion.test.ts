import { LIBRARY } from '../../content/library';
import { customPractice, practiceFromTechnique, quickBox } from '../../practice/practice';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { companionContext, MAX_WATCH_PRACTICES, recordFromWatch, watchPractice, type WatchSession } from '../companion';

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
    const p = watchPractice(technique('nadi-shodhana'));
    expect(p.key).toBe('technique:nadi-shodhana');
    expect(p.detail).toBe('in 4 · out 6, each side · 5 min');
    expect(p.steps.map((s) => s.label)).toEqual(['Inhale left', 'Exhale right', 'Inhale right', 'Exhale left']);
    expect(p.rounds).toBe(15);
    expect(p.durationMs).toBe(300_000);
    expect(JSON.parse(p.practiceJson).techniqueId).toBe('nadi-shodhana');
  });

  it('keeps distinct practices in order, with the haptic settings', () => {
    const many = [quickBox(), technique('sama-vritti'), customPractice(), customPractice(), ...LIBRARY.map((t) => practiceFromTechnique(t))];
    const context = companionContext(many, DEFAULT_PREFERENCES, NOW);
    expect(context.practices).toHaveLength(MAX_WATCH_PRACTICES);
    expect(context.practices.filter((p) => p.key === 'custom')).toHaveLength(1);
    expect(new Set(context.practices.map((p) => p.key)).size).toBe(MAX_WATCH_PRACTICES);
    expect(context.haptics).toEqual({ style: 'marks', phases: { inhale: true, hold: true, exhale: true, rest: true } });
    // Small enough for WatchConnectivity's application context and a Wear OS data item.
    expect(JSON.stringify(context).length).toBeLessThan(20_000);
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

  it.each([
    ['wrong version', { v: 2 as 1 }],
    ['bad id', { id: 'x' }],
    ['no time', { activeMs: 0 }],
    ['three hours', { activeMs: 3 * 60 * 60_000 + 1 }],
    ['far future', { startedAt: NOW + 2 * 24 * 60 * 60_000 }],
    ['negative rounds', { completedRounds: -1 }],
    ['more rounds than planned', { completedRounds: 16 }],
    ['bad outcome', { outcome: 'won' as 'ended' }],
    ['not JSON', { practiceJson: '{' }],
    ['out-of-bounds practice', { practiceJson: JSON.stringify({ ...technique('sama-vritti'), steps: [{ kind: 'inhale', seconds: 99 }] }) }],
    ['unknown technique', { practiceJson: JSON.stringify({ ...technique('sama-vritti'), techniqueId: 'kapalabhati', source: { kind: 'technique', id: 'kapalabhati' } }) }],
  ])('rejects %s', (_, change) => {
    expect(recordFromWatch(session(change), NOW)).toBeNull();
  });
});
