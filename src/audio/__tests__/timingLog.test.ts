import { beginTimingLog, currentTimingLog, markSegment, recordCue, summarize, timingCsv, type TimingEntry } from '../timingLog';

const cue = (driftMs: number, sound = 'voice.inhale', atMs = 3000): TimingEntry => ({ kind: 'cue', segment: 1, atMs, driftMs, sound, wallMs: 0 });

describe('cue timing log', () => {
  it('summarizes drift against the ±250 ms target', () => {
    const summary = summarize([cue(10), cue(-40), cue(300), cue(-5, 'tone.soft-bells.complete', 307_000), { kind: 'mark', segment: 1, label: 'x', wallMs: 0 }]);
    expect(summary).toEqual({ cues: 4, meanAbsMs: 88.75, p95AbsMs: 300, maxAbsMs: 300, withinTarget: 0.75, endDriftMs: -5 });
  });

  it('has nothing to summarize without cues', () => {
    expect(summarize([])).toBeNull();
  });

  it('records segments and exports CSV', () => {
    beginTimingLog('Sama Vritti', 'ios · voice');
    markSegment('Guidance started');
    recordCue({ atMs: 3000, driftMs: 12.34, sound: 'voice.inhale' });
    const log = currentTimingLog()!;
    expect(log.entries.map((e) => [e.kind, e.segment])).toEqual([
      ['mark', 1],
      ['cue', 1],
    ]);
    const csv = timingCsv(log).split('\n');
    expect(csv[1]).toBe('segment,wall_s,kind,planned_ms,drift_ms,sound_or_label');
    expect(csv[3]).toMatch(/^1,\d+\.\d\d,cue,3000\.0,12\.3,"voice\.inhale"$/);
  });
});
