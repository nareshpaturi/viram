/// <reference types="node" />
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LIBRARY } from '../../content/library';
import { applyImport, buildExport, checkImport } from '../../data/transfer';
import type { SessionRecord } from '../../history/repository';
import { practiceFromTechnique } from '../../practice/practice';
import { MAX_RHYTHMS } from '../../rhythms/repository';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { routineRun } from '../../routines/repository';
import { MIGRATIONS, MigrationError, migrate, schemaVersion } from '../db';
import { createStores } from '../stores';
import { memoryDb } from './testDb';

const freshStores = () => {
  const db = memoryDb();
  migrate(db);
  return createStores(db);
};

const custom = [
  { kind: 'inhale' as const, seconds: 4 },
  { kind: 'hold' as const, seconds: 4 },
  { kind: 'exhale' as const, seconds: 6 },
  { kind: 'rest' as const, seconds: 4 },
];

const record = (id: string, overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id,
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
  ...overrides,
});

describe('migrations', () => {
  it('creates schema 1 from nothing and is idempotent', () => {
    const db = memoryDb();
    migrate(db);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
    migrate(db);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
  });

  it('keeps existing data when a later migration fails', () => {
    const db = memoryDb();
    migrate(db);
    createStores(db).history.save(record('a'));
    expect(() => migrate(db, [...MIGRATIONS, 'ALTER TABLE sessions ADD COLUMN x INTEGER; THIS IS NOT SQL;'])).toThrow(MigrationError);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
    expect(createStores(db).history.list()).toHaveLength(1);
    expect(db.getAllSync<{ name: string }>("SELECT name FROM pragma_table_info('sessions') WHERE name = 'x'", [])).toHaveLength(0);
  });

  it('survives reopening a file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'viram-')), 'test.sqlite');
    const first = memoryDb(path);
    migrate(first);
    createStores(first).history.save(record('a'));
    first.close();
    const second = memoryDb(path);
    migrate(second);
    expect(createStores(second).history.get('a')).toEqual(record('a'));
  });
});

describe('history', () => {
  it('saves once, lists newest first, and keeps ended-early zero-round records', () => {
    const { history } = freshStores();
    history.save(record('old', { startedAt: 1 }));
    history.save(record('new', { startedAt: 2, outcome: 'ended', completedRounds: 0, activeMs: 5_000 }));
    history.save(record('new', { startedAt: 2 }));
    expect(history.list().map((r) => [r.id, r.outcome, r.completedRounds])).toEqual([
      ['new', 'ended', 0],
      ['old', 'completed', 19],
    ]);
  });

  it('delete removes history only', () => {
    const stores = freshStores();
    stores.history.save(record('a'));
    stores.rhythms.save({ name: 'Mine', steps: custom, target: { minutes: 5 }, techniqueId: null, origin: 'custom' });
    stores.preferences.write({ cueMode: 'tones' });
    stores.history.deleteAll();
    expect(stores.history.list()).toHaveLength(0);
    expect(stores.rhythms.list()).toHaveLength(1);
    expect(stores.preferences.read().cueMode).toBe('tones');
  });
});

describe('my rhythms', () => {
  it('saves up to 20 and never overwrites', () => {
    const { rhythms } = freshStores();
    for (let i = 0; i < MAX_RHYTHMS; i++) {
      expect(rhythms.save({ name: `Rhythm ${i}`, steps: custom, target: { rounds: i + 1 }, techniqueId: null, origin: 'custom' }).ok).toBe(true);
    }
    expect(rhythms.save({ name: 'One more', steps: custom, target: { minutes: 5 }, techniqueId: null, origin: 'custom' })).toEqual({ ok: false, reason: 'limit' });
    expect(rhythms.count()).toBe(20);
  });

  it('checks names and rhythms like a share link', () => {
    const { rhythms } = freshStores();
    const base = { steps: custom, target: { minutes: 5 as const }, techniqueId: null, origin: 'custom' as const };
    expect(rhythms.save({ ...base, name: '' }).ok).toBe(false);
    expect(rhythms.save({ ...base, name: 'x'.repeat(41) }).ok).toBe(false);
    expect(rhythms.save({ ...base, name: 'x'.repeat(40) }).ok).toBe(true);
    expect(rhythms.save({ ...base, name: 'Too long', steps: [{ kind: 'inhale', seconds: 25 }, ...custom.slice(1)] }).ok).toBe(false);
    const saved = rhythms.save({ ...base, name: 'Evening' });
    expect(rhythms.save({ ...base, name: 'Evening' })).toMatchObject({ ok: false, reason: 'duplicate' });
    expect(saved.ok && rhythms.rename(saved.rhythm.id, '<b>')).toBeNull();
  });

  it('keeps technique IDs and structure for adjusted library practices', () => {
    const { rhythms } = freshStores();
    const nadi = practiceFromTechnique(LIBRARY.find((t) => t.id === 'nadi-shodhana')!);
    const steps = nadi.steps.map((s) => (s.kind === 'exhale' ? { ...s, seconds: 7 } : s));
    const result = rhythms.save({ name: 'Sunday class', steps, target: { rounds: 21 }, techniqueId: 'nadi-shodhana', origin: 'adjusted' });
    expect(result.ok && result.rhythm).toMatchObject({ techniqueId: 'nadi-shodhana', steps: [{ side: 'left' }, { side: 'right', seconds: 7 }, {}, {}] });
  });

  it('rename and delete leave history snapshots unchanged', () => {
    const stores = freshStores();
    const saved = stores.rhythms.save({ name: 'Evening', steps: custom, target: { minutes: 5 }, techniqueId: null, origin: 'custom' });
    if (!saved.ok) throw new Error('save failed');
    stores.history.save(record('s', { source: { kind: 'rhythm', id: saved.rhythm.id }, techniqueId: null, name: 'Evening', steps: custom }));
    expect(stores.rhythms.rename(saved.rhythm.id, 'Night')?.name).toBe('Night');
    stores.rhythms.remove(saved.rhythm.id);
    expect(stores.rhythms.list()).toHaveLength(0);
    expect(stores.history.get('s')).toMatchObject({ name: 'Evening', steps: custom });
  });
});

describe('preferences', () => {
  it('pauses other audio by default on iOS, for lock-screen controls', () => {
    expect(freshStores().preferences.read().otherAudio).toBe('pause');
  });

  it('defaults, persists, and ignores bad values', () => {
    const { preferences } = freshStores();
    expect(preferences.read()).toEqual(DEFAULT_PREFERENCES);
    preferences.write({ cueMode: 'silent', hapticStrength: 'strong', lastPractice: practiceFromTechnique(LIBRARY[2]) });
    expect(preferences.read()).toMatchObject({ cueMode: 'silent', hapticStrength: 'strong', lastPractice: { techniqueId: 'nadi-shodhana' } });
    preferences.write({ cueMode: 'loud' as never, cueVolume: 7 });
    expect(preferences.read()).toMatchObject({ cueMode: 'voice', cueVolume: DEFAULT_PREFERENCES.cueVolume });
  });
});

describe('export and import', () => {
  const populated = () => {
    const stores = freshStores();
    stores.history.save(record('a'));
    stores.history.save(record('b', { outcome: 'ended', completedRounds: 2 }));
    stores.rhythms.save({ name: 'Evening', steps: custom, target: { minutes: 5 }, techniqueId: null, origin: 'custom' });
    stores.preferences.write({ firstUseComplete: true, toneSet: 'wood', reminder: { enabled: true, hour: 6, minute: 30 } });
    return stores;
  };

  it('restores everything into a clean install', () => {
    const file = JSON.stringify(buildExport(populated()));
    const target = freshStores();
    const check = checkImport(file, target);
    if (!check.ok) throw new Error(check.reason);
    expect(check.plan.rhythms.newItems).toHaveLength(1);
    expect(check.plan.sessions.newItems).toHaveLength(2);
    applyImport(check.plan, target);
    expect(target.history.list()).toHaveLength(2);
    expect(target.rhythms.list()[0].name).toBe('Evening');
    expect(target.preferences.read()).toMatchObject({ toneSet: 'wood', firstUseComplete: false });
    // The reminder needs this device's notification permission, so it stays off.
    expect(target.preferences.read().reminder.enabled).toBe(false);
  });

  it('adds nothing twice and keeps settings in a populated install', () => {
    const source = populated();
    const file = JSON.stringify(buildExport(source));
    const target = populated();
    target.preferences.write({ toneSet: 'chimes' });
    const check = checkImport(file, target);
    if (!check.ok) throw new Error(check.reason);
    expect(check.plan.sessions.newItems).toHaveLength(0);
    expect(check.plan.preferences).toBeNull();
    applyImport(check.plan, target);
    expect(target.history.list()).toHaveLength(2);
    expect(target.preferences.read().toneSet).toBe('chimes');
  });

  it('imports nothing from an invalid file', () => {
    const target = freshStores();
    const file = buildExport(populated());
    file.rhythms[0].steps[0].seconds = 30;
    expect(checkImport(JSON.stringify(file), target)).toEqual({ ok: false, reason: 'invalid' });
    expect(checkImport('not json', target)).toEqual({ ok: false, reason: 'invalid' });
    expect(checkImport(JSON.stringify({ ...buildExport(populated()), version: 99 }), target)).toEqual({ ok: false, reason: 'newer' });
    const unknownTechnique = buildExport(populated());
    unknownTechnique.sessions[0].techniqueId = 'kapalabhati';
    expect(checkImport(JSON.stringify(unknownTechnique), target)).toEqual({ ok: false, reason: 'invalid' });
    expect(target.history.list()).toHaveLength(0);
  });
});

describe('routines (FR-14)', () => {
  const box = { ref: { kind: 'technique' as const, id: 'sama-vritti' }, minutes: 3 };
  const coherent = { ref: { kind: 'technique' as const, id: 'coherent' }, minutes: 5 };

  it('saves 2–6 practices, allows repeats, and rejects the rest', () => {
    const { routines } = freshStores();
    expect(routines.save({ name: 'Evening', segments: [box] })).toEqual({ ok: false, reason: 'invalid' });
    expect(routines.save({ name: 'Evening', segments: Array(7).fill(box) })).toEqual({ ok: false, reason: 'invalid' });
    expect(routines.save({ name: 'Evening', segments: [box, { ...box, minutes: 31 }] })).toEqual({ ok: false, reason: 'invalid' });
    expect(routines.save({ name: 'Evening', segments: [box, { ref: { kind: 'technique', id: 'kapalabhati' }, minutes: 3 }] })).toEqual({ ok: false, reason: 'invalid' });
    const saved = routines.save({ name: 'Evening', segments: [box, coherent, box] });
    expect(saved.ok && routines.get(saved.routine.id)?.segments).toHaveLength(3);
  });

  it('resolves to a run with each practice at its own minutes, and flags deleted rhythms', () => {
    const stores = freshStores();
    const rhythm = stores.rhythms.save({ name: 'Mine', steps: custom, target: { minutes: 5 }, techniqueId: null, origin: 'custom' });
    if (!rhythm.ok) throw new Error('rhythm');
    const saved = stores.routines.save({ name: 'Mixed', segments: [box, { ref: { kind: 'rhythm', id: rhythm.rhythm.id }, minutes: 7 }] });
    if (!saved.ok) throw new Error('routine');
    const resolved = routineRun(saved.routine, stores.rhythms);
    expect('run' in resolved && resolved.run.parts.map((p) => [p.name, p.target])).toEqual([
      ['Sama Vritti', { minutes: 3 }],
      ['Mine', { minutes: 7 }],
    ]);
    stores.rhythms.remove(rhythm.rhythm.id);
    expect(routineRun(saved.routine, stores.rhythms)).toEqual({ missing: [1] });
  });

  it('exports and imports routines without duplicates', () => {
    const source = freshStores();
    source.routines.save({ name: 'Morning', segments: [box, coherent] });
    const file = JSON.stringify(buildExport(source));
    const target = freshStores();
    const check = checkImport(file, target);
    if (!check.ok) throw new Error(check.reason);
    applyImport(check.plan, target);
    expect(target.routines.list().map((r) => r.name)).toEqual(['Morning']);
    const again = checkImport(file, target);
    expect(again.ok && again.plan.routines.newItems).toHaveLength(0);
  });

  it('keeps routine records with every practice reached', () => {
    const { history } = freshStores();
    const parts = [
      { name: 'Sama Vritti', techniqueId: 'sama-vritti', steps: custom, target: { minutes: 3 }, activeMs: 192_000, completedRounds: 12, breathsPerMinute: 3.75, outcome: 'completed' as const },
      { name: 'Coherent breathing', techniqueId: 'coherent', steps: custom, target: { minutes: 5 }, activeMs: 23_000, completedRounds: 2, breathsPerMinute: 5.5, outcome: 'ended' as const },
    ];
    history.save(record('r', { source: { kind: 'routine', id: 'x' }, parts, program: { id: 'foundations', name: 'Pranayama Foundations', session: 6 }, outcome: 'ended' }));
    expect(history.get('r')).toMatchObject({ source: { kind: 'routine' }, parts, program: { session: 6 }, health: 'none' });
  });
});

describe('migration 1 → 2', () => {
  it('keeps every v1.0 record when sessions are rebuilt', () => {
    const db = memoryDb();
    migrate(db, MIGRATIONS.slice(0, 1));
    db.runSync(
      "INSERT INTO sessions (id, started_at, active_ms, practice_kind, practice_ref, technique_id, name, steps, target_kind, target_value, completed_rounds, breaths_per_minute, outcome, cue_mode, haptics) VALUES ('old', 1, 60000, 'technique', 'sama-vritti', 'sama-vritti', 'Sama Vritti', ?, 'minutes', 5, 19, 3.75, 'completed', 'voice', 1)",
      [JSON.stringify(custom)],
    );
    migrate(db);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
    expect(createStores(db).history.get('old')).toMatchObject({ name: 'Sama Vritti', parts: null, program: null, health: 'none' });
  });
});
