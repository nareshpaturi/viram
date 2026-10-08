import { HINDI_CUES, HINDI_INTROS } from '../hindi';
import { LIBRARY } from '../library';
import { CUES } from '../voice';

describe('Hindi voice scripts', () => {
  it('has a Hindi line for every cue', () => {
    expect(Object.keys(HINDI_CUES).sort()).toEqual(Object.keys(CUES).sort());
    for (const text of Object.values(HINDI_CUES)) expect(text).toMatch(/^[ऀ-ॿ ]+$/);
  });

  it('introduces every technique line for line with the English, so captions match what is heard', () => {
    for (const technique of LIBRARY) {
      const intro = HINDI_INTROS[technique.id];
      expect(intro).toBeDefined();
      expect(intro.lines).toHaveLength(technique.guidance.introduction.lines.length);
      expect(intro.long).toHaveLength(technique.guidance.introduction.long?.lines.length ?? 0);
    }
  });

  it('keeps hold and rest distinct by ear, and sides in every side phrase', () => {
    expect(HINDI_CUES.hold).not.toBe(HINDI_CUES.rest);
    expect(HINDI_CUES['inhale-left']).toContain('बाएँ');
    expect(HINDI_CUES['exhale-right']).toContain('दाएँ');
  });
});
