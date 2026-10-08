/**
 * The practice session hook against a mocked native guide: regressions from
 * the iOS and Android QA reports of 2026-10-08.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo } from 'react-native';
import * as guide from '../../audio/guide';
import { useScreenReader } from '../../accessibility/useScreenReader';
import { LIBRARY } from '../../content/library';
import { DEFAULT_PREFERENCES, type Preferences } from '../../settings/preferences';
import { defaultPractice, practiceFromTechnique } from '../practice';
import { singleRun, type PracticeRun } from '../run';
import { usePracticeSession } from '../usePracticeSession';

jest.mock('../../audio/guide', () => ({
  practiceSounds: jest.fn(() => []),
  prepareSounds: jest.fn(async () => {}),
  clipLength: jest.fn(() => 600),
  startSegment: jest.fn(),
  positionMs: jest.fn(() => 0),
  pause: jest.fn(() => 0),
  stop: jest.fn(),
  finish: jest.fn(),
  setVolume: jest.fn(),
  setNowPlaying: jest.fn(),
  subscribe: jest.fn(() => () => {}),
  audioAvailable: jest.fn(() => true),
}));
jest.mock('../../accessibility/useScreenReader', () => ({ useScreenReader: jest.fn(() => false) }));
jest.mock('../../storage', () => ({ stores: jest.fn() }));
jest.mock('../../audio/timingLog', () => ({ beginTimingLog: jest.fn(), markSegment: jest.fn(), markTiming: jest.fn() }));
jest.mock('../../audio/manifest.generated', () => ({ CLIP_MS: new Proxy({}, { get: () => new Proxy({}, { get: () => 6000 }) }), PLACEHOLDER_VOICE: true }));

const mocked = guide as jest.Mocked<typeof guide>;
type Session = ReturnType<typeof usePracticeSession>;

let renderer: ReactTestRenderer | undefined;
let session: Session;
const heard = jest.fn();

async function mount(patch: Partial<Preferences> = {}, run: PracticeRun = singleRun(defaultPractice())) {
  const preferences = { ...DEFAULT_PREFERENCES, firstUseComplete: true, music: 'off' as const, ...patch };
  function Probe() {
    session = usePracticeSession({ run, preferences, quickStart: false, night: false, onIntroHeard: heard });
    return null;
  }
  await act(async () => {
    renderer = create(<Probe />);
  });
}

const tick = (positionMs: number) =>
  act(async () => {
    mocked.positionMs.mockReturnValue(positionMs);
    jest.advanceTimersByTime(50);
  });

const part = (id: string) => ({ ...practiceFromTechnique(LIBRARY.find((t) => t.id === id)!), target: { rounds: 1 } });
const routine = (...ids: string[]): PracticeRun => ({ name: 'Routine', parts: ids.map(part), routineId: 'r', program: null });
const spokenVoice = () => mocked.startSegment.mock.calls.flatMap(([schedule, options]) => (options.volume > 0 ? schedule.cues.filter((c) => c.sound?.startsWith('voice.')) : []));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mocked.positionMs.mockReturnValue(0);
  mocked.pause.mockReturnValue(0);
  mocked.clipLength.mockReturnValue(600);
  (useScreenReader as jest.Mock).mockReturnValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Silent never speaks (QA F01, AQ-01)', () => {
  it.each(['first', 'always'] as const)('shows the how-to instead of a spoken introduction (%s)', async (introductions) => {
    await mount({ cueMode: 'silent', introductions });
    expect(spokenVoice()).toEqual([]);
    expect(mocked.startSegment).not.toHaveBeenCalled();
    expect(session.view).toEqual({ kind: 'prepare', part: 0 });
  });

  it('begins the silent practice from the how-to', async () => {
    await mount({ cueMode: 'silent', introductions: 'always' });
    await act(async () => session.actions.skipIntro());
    expect(session.view).toMatchObject({ kind: 'countdown', purpose: 'settle' });
    expect(spokenVoice()).toEqual([]);
    expect(heard).toHaveBeenCalledWith('sama-vritti');
  });
});

describe('a spoken introduction shares the practice’s timeline (QA F05, AQ-02)', () => {
  it('schedules the introduction and the practice as one native segment', async () => {
    await mount({ introductions: 'always' });
    expect(mocked.startSegment).toHaveBeenCalledTimes(1);
    const [schedule] = mocked.startSegment.mock.calls[0];
    expect(schedule.cues[0]).toMatchObject({ atMs: 0, sound: 'voice.intro.sama-vritti' });
    // The practice's first cue follows the 6 s clip, a 0.4 s gap, and the 3 s settle lead.
    expect(schedule.cues[1].atMs).toBe(6000 + 400 + 3000);
  });

  it('moves into the practice from the clock alone, without a second segment', async () => {
    await mount({ introductions: 'always' });
    expect(session.view.kind).toBe('intro');
    await tick(6400 + 3000 + 50);
    expect(session.view).toMatchObject({ kind: 'running' });
    expect(mocked.startSegment).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith('sama-vritti');
  });

  it('completes a practice that played to its end while JavaScript was asleep', async () => {
    await mount({ introductions: 'always' });
    const handlers = mocked.subscribe.mock.calls.at(-1)![0];
    mocked.positionMs.mockReturnValue(-1);
    await act(async () => handlers.onSegmentEnded!());
    expect(session.view).toMatchObject({ kind: 'finished', record: { outcome: 'completed', completedRounds: 19 } });
  });
});

describe('a routine stops before a practice it hasn’t taught (QA F04, AQ-03)', () => {
  const prefs = { introductions: 'first' as const, introductionsHeard: ['sama-vritti'] };

  it('ends the native segment at the boundary', async () => {
    await mount(prefs, routine('sama-vritti', 'nadi-shodhana'));
    const [schedule] = mocked.startSegment.mock.calls[0];
    expect(schedule.endMs).toBe(3000 + 16_000);
    expect(schedule.cues.some((c) => c.nowPlaying === 'Up next · Nadi Shodhana')).toBe(true);
  });

  it.each([19_100, 24_100, 60_000])('waits for Begin even when the clock jumps to %i ms', async (clock) => {
    await mount(prefs, routine('sama-vritti', 'nadi-shodhana'));
    await tick(clock);
    expect(session.view).toMatchObject({ kind: 'paused', reason: 'prepare', part: 1 });
    expect(heard).toHaveBeenCalledWith('nadi-shodhana');
  });

  it('continues with the next practice’s own segment after Begin', async () => {
    await mount(prefs, routine('sama-vritti', 'nadi-shodhana'));
    await tick(19_100);
    await act(async () => session.actions.resume());
    const [schedule] = mocked.startSegment.mock.calls.at(-1)!;
    expect(schedule.cues.find((c) => c.sound)?.sound).toMatch(/inhale-left/);
  });
});

describe('screen readers hear every step the voice doesn’t speak (QA F03)', () => {
  it('announces steps when the voice has no clips and falls back to tones', async () => {
    (useScreenReader as jest.Mock).mockReturnValue(true);
    mocked.clipLength.mockReturnValue(undefined);
    await mount({ cueMode: 'voice', introductions: 'never' });
    await tick(3050);
    expect(session.view.kind).toBe('running');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Inhale, 4 seconds');
    expect(session.speech).toBe('screenReader');
  });

  it('stays quiet when the voice speaks the step', async () => {
    (useScreenReader as jest.Mock).mockReturnValue(true);
    await mount({ cueMode: 'voice', introductions: 'never' });
    await tick(3050);
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalledWith('Inhale, 4 seconds');
  });
});

describe('pause and end', () => {
  it('keep active time and restart from the inhale', async () => {
    await mount({ introductions: 'never' });
    await tick(8100);
    mocked.pause.mockReturnValue(8100);
    await act(async () => session.actions.pause());
    expect(session.view).toMatchObject({ kind: 'paused', resumeStep: 'Inhale' });
    mocked.positionMs.mockReturnValue(0);
    await act(async () => session.actions.resume());
    expect(session.view).toMatchObject({ kind: 'countdown', purpose: 'resume' });
    mocked.pause.mockReturnValue(4100);
    await act(async () => session.actions.askToEnd());
    await act(async () => session.actions.endSession());
    expect(session.view).toMatchObject({ kind: 'finished', record: { activeMs: 6200, outcome: 'ended' } });
  });

  it('measures a pause after the introduction on the practice’s own clock', async () => {
    await mount({ introductions: 'always' });
    // 6.4 s of introduction, 3 s settle, then 5 s into the practice.
    await tick(6400 + 3000 + 5000);
    mocked.pause.mockReturnValue(6400 + 3000 + 5000);
    await act(async () => session.actions.pause());
    await act(async () => session.actions.askToEnd());
    await act(async () => session.actions.endSession());
    expect(session.view).toMatchObject({ kind: 'finished', record: { activeMs: 5000 } });
  });
});
