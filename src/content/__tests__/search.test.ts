import { LIBRARY } from '../library';
import { matches, searchLibrary } from '../search';

describe('practices search', () => {
  it('finds Nadi Shodhana as Anulom Vilom, however it is typed', () => {
    for (const q of ['Anulom Vilom', 'anulom', 'anulom-vilom', 'ANULOMVILOM']) {
      expect(searchLibrary(LIBRARY, q).map((t) => t.id)).toEqual(['nadi-shodhana']);
    }
  });

  it('matches names and English names, and everything for an empty query', () => {
    expect(searchLibrary(LIBRARY, 'box').map((t) => t.id)).toEqual(['sama-vritti']);
    expect(searchLibrary(LIBRARY, 'hum').map((t) => t.id)).toContain('bhramari');
    expect(searchLibrary(LIBRARY, '  ')).toHaveLength(LIBRARY.length);
    expect(matches('pranayama', ['Prāṇāyāma'])).toBe(true);
  });
});
