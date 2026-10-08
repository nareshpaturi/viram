/** Import boundaries: regressions from the iOS and Android QA reports of 2026-10-08. */
import { act, create } from 'react-test-renderer';
import { LIBRARY } from '../../content/library';
import type { SessionRecord } from '../../history/repository';
import { practiceFromTechnique } from '../../practice/practice';
import { PROGRAMS, findProgram } from '../../programs/definitions';
import { start } from '../../programs/engine';
import { enrollmentFrom } from '../../programs/repository';
import { PreferencesProvider, usePreferences } from '../../settings/PreferencesProvider';
import { stores } from '../../storage';
import { migrate } from '../../storage/db';
import { createStores } from '../../storage/stores';
import { memoryDb } from '../../storage/__tests__/testDb';
import { applyImport, buildExport, checkImport } from '../transfer';

jest.mock('../../storage', () => ({ stores: jest.fn() }));

const freshStores = () => {
  const db = memoryDb();
  migrate(db);
  return createStores(db);
};

const record = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: 's1',
  startedAt: 1_758_000_000_000,
  activeMs: 304_000,
  source: { kind: 'technique', id: 'sama-vritti' },
  techniqueId: 'sama-vritti',
  name: 'Sama Vritti',
  steps: practiceFromTechnique(LIBRARY[0]).steps,
  target: { minutes: 5 },
  completedRounds: 19,
  breathsPerMinute: 3.75,
  outcome: 'completed',
  cueMode: 'voice',
  haptics: true,
  parts: null,
  program: null,
  health: 'none',
  slowing: null,
  ...overrides,
});

/** An export from a device with one program enrollment, edited by `change`. */
function exportWithProgram(change: (definition: Record<string, unknown>) => void): string {
  const source = freshStores();
  source.programs.activate(start(findProgram('foundations')!, 'e1', null, 1), 1);
  const file = buildExport(source) as unknown as { programs: { definition: Record<string, unknown> }[] };
  change(file.programs[0].definition);
  return JSON.stringify(file);
}

describe('imported settings apply at once (QA F02, AQ-04)', () => {
  it('reloads the mounted preferences after an import', async () => {
    const repository = freshStores();
    (stores as jest.Mock).mockReturnValue(repository);
    let observed: ReturnType<typeof usePreferences> | undefined;
    function Probe() {
      observed = usePreferences();
      return null;
    }
    await act(async () => {
      create(
        <PreferencesProvider>
          <Probe />
        </PreferencesProvider>,
      );
    });
    const file = buildExport(repository) as unknown as { preferences: Record<string, unknown> };
    file.preferences = { cueMode: 'silent', voice: 'bf_emma', cueVolume: 0.2 };
    const checked = checkImport(JSON.stringify(file), repository);
    if (!checked.ok) throw new Error('import rejected');
    applyImport(checked.plan, repository);
    expect(observed!.preferences.cueMode).toBe('voice');
    await act(async () => {
      observed!.reload();
    });
    expect(observed!.preferences).toMatchObject({ cueMode: 'silent', voice: 'bf_emma', cueVolume: 0.2 });
  });
});

describe('malformed programs are rejected (QA F07, AQ-05)', () => {
  it('keeps every bundled program valid', () => {
    for (const program of PROGRAMS) expect(enrollmentFrom(start(program, 'e', null, 1))).not.toBeNull();
  });

  it('accepts the same export unchanged', () => {
    const checked = checkImport(exportWithProgram(() => {}), freshStores());
    expect(checked).toMatchObject({ ok: true });
    expect(checked.ok && checked.plan.programs).toHaveLength(1);
  });

  it.each([
    ['a missing eyebrow', (d: Record<string, unknown>) => delete d.eyebrow],
    ['negative minutes', (d: any) => (d.sessions[0].parts[0].minutes = -5)],
    ['zero minutes', (d: any) => (d.sessions[0].parts[0].minutes = 0)],
    ['an unknown technique', (d: any) => (d.sessions[0].parts[0].techniqueId = 'not-a-real-technique')],
    ['a session with no parts', (d: any) => (d.sessions[0].parts = [])],
    ['an out-of-range phase', (d: any) => (d.phases = [{ first: 1, last: 99, summary: 's', intro: 'i' }])],
  ])('rejects a program with %s', (_label, change) => {
    expect(checkImport(exportWithProgram(change), freshStores())).toMatchObject({ ok: false });
  });
});

describe('records with impossible values are rejected (QA F08)', () => {
  it('rejects a negative duration instead of dropping it silently', () => {
    const source = freshStores();
    source.history.save(record());
    const file = buildExport(source) as unknown as { sessions: Record<string, unknown>[] };
    file.sessions[0].activeMs = -60_000;
    expect(checkImport(JSON.stringify(file), freshStores())).toMatchObject({ ok: false });
  });

  it('still keeps one copy of a record saved twice', () => {
    const repository = freshStores();
    repository.history.save(record());
    repository.history.save(record());
    expect(repository.history.count()).toBe(1);
  });
});
