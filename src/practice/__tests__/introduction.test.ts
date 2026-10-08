import { LIBRARY } from '../../content/library';
import { chooseIntroduction, partsToPrepare } from '../introduction';
import { practiceFromTechnique } from '../practice';
import type { Preferences } from '../../settings/preferences';

const technique = (id: string) => LIBRARY.find((t) => t.id === id)!;
const practice = (id: string) => practiceFromTechnique(technique(id));
const withSeconds = (id: string, seconds: number[]) => ({ ...practice(id), steps: practice(id).steps.map((s, i) => ({ ...s, seconds: seconds[i] })) });
const prefs: Pick<Preferences, 'introductions' | 'introductionsHeard' | 'introLength'> = { introductions: 'first', introductionsHeard: [], introLength: 'short' };
const choose = (id: string, p = practice(id), preferences = prefs) => chooseIntroduction(technique(id), p, preferences, false);

// The content review's acceptance (2026-10-08, F3): no adjusted rhythm hears counts or holds it isn't doing.
describe('introductions follow the rhythm being practised', () => {
  it('introduce a technique’s own rhythm as usual, short or long', () => {
    expect(choose('sama-vritti')).toBe('short');
    expect(choose('sama-vritti', practice('sama-vritti'), { ...prefs, introLength: 'long' })).toBe('long');
  });

  it('skip an introduction that names counts or holds once the rhythm is adjusted', () => {
    expect(choose('sama-vritti', withSeconds('sama-vritti', [4, 0, 4, 0]))).toBeNull();
    expect(choose('ujjayi', withSeconds('ujjayi', [6, 6]))).toBeNull();
    expect(choose('visama-vritti', withSeconds('visama-vritti', [4, 2, 6, 0]))).toBeNull();
  });

  it('keep an introduction that names no counts, and fall back from a long one that does', () => {
    expect(choose('nadi-shodhana', withSeconds('nadi-shodhana', [4, 4, 4, 4]))).toBe('short');
    expect(choose('nadi-shodhana', withSeconds('nadi-shodhana', [4, 4, 4, 4]), { ...prefs, introLength: 'long' })).toBe('long');
    expect(choose('bhramari', withSeconds('bhramari', [4, 6]), { ...prefs, introLength: 'long' })).toBe('short');
  });

  it('treats gradual slowing as an adjusted rhythm', () => {
    expect(choose('coherent', { ...practice('coherent'), slowing: { inhale: 6, exhale: 6 } }, { ...prefs, introLength: 'long' })).toBe('long');
  });

  it('honours the introduction setting', () => {
    expect(choose('sama-vritti', practice('sama-vritti'), { ...prefs, introductionsHeard: ['sama-vritti'] })).toBeNull();
    expect(choose('sama-vritti', practice('sama-vritti'), { ...prefs, introductions: 'never' })).toBeNull();
    expect(chooseIntroduction(technique('sama-vritti'), practice('sama-vritti'), prefs, true)).toBeNull();
  });
});

// F9: a routine shows how a later practice is done before its first cue.
describe('routines prepare later practices they haven’t taught', () => {
  it('prepares a new alternate-nostril practice in position two', () => {
    expect(partsToPrepare([practice('sama-vritti'), practice('nadi-shodhana')], prefs)).toEqual([1]);
  });

  it('skips practices already taught in this run or heard before, and custom rhythms', () => {
    const custom = { techniqueId: null };
    expect(partsToPrepare([practice('ujjayi'), practice('nadi-shodhana'), practice('ujjayi'), custom], { ...prefs, introductionsHeard: ['nadi-shodhana'] })).toEqual([]);
  });

  it('prepares every later practice when introductions are always on, and none when off', () => {
    const run = [practice('ujjayi'), practice('nadi-shodhana'), practice('bhramari')];
    expect(partsToPrepare(run, { ...prefs, introductions: 'always', introductionsHeard: ['nadi-shodhana', 'bhramari'] })).toEqual([1, 2]);
    expect(partsToPrepare(run, { ...prefs, introductions: 'never' })).toEqual([]);
  });
});
