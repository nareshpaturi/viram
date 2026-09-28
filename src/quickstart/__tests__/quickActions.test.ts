import { LIBRARY } from '../../content/library';
import type { SessionRecord } from '../../history/repository';
import { practiceFromTechnique } from '../../practice/practice';
import { quickActionItems } from '../quickActions';

const technique = (id: string) => practiceFromTechnique(LIBRARY.find((t) => t.id === id)!);
const record = (id: string, practiceId: string): SessionRecord => {
  const p = technique(practiceId);
  return {
    id,
    startedAt: 1,
    activeMs: 60_000,
    source: p.source,
    techniqueId: p.techniqueId,
    name: p.name,
    steps: p.steps,
    target: p.target,
    completedRounds: 3,
    breathsPerMinute: 6,
    outcome: 'completed',
    cueMode: 'voice',
    haptics: true,
    parts: null,
    program: null,
    health: 'none',
  };
};

describe('quick actions', () => {
  it('offers only 1-minute box breathing with no history', () => {
    expect(quickActionItems(null, []).map((a) => a.id)).toEqual(['box']);
    expect(quickActionItems(technique('bhramari'), []).map((a) => a.id)).toEqual(['box']);
  });

  it('names the last practice and omits the third action with one distinct practice', () => {
    const items = quickActionItems(technique('nadi-shodhana'), [record('a', 'nadi-shodhana'), record('b', 'nadi-shodhana')]);
    expect(items.map((a) => a.id)).toEqual(['last', 'box']);
    expect(items[0].subtitle).toBe('Nadi Shodhana · 5 min');
    expect(items[1].subtitle).toBe('Sama Vritti · 4 · 4 · 4 · 4');
  });

  it('adds the most recent other practice', () => {
    const history = [record('a', 'nadi-shodhana'), record('b', 'bhramari'), record('c', 'ujjayi')];
    const items = quickActionItems(technique('nadi-shodhana'), history);
    expect(items.map((a) => a.id)).toEqual(['last', 'box', 'recent']);
    expect(items[2].title).toBe('Bhramari · 5 min');
    expect(JSON.parse(items[2].params!.practice).techniqueId).toBe('bhramari');
  });
});
