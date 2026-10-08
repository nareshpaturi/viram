import { LOCK_TIP, MODE_HELP, lockBehavior, screenReaderNote, speechOwner } from '../guidanceRules';

describe('lock behavior', () => {
  const at = (mode: 'voice' | 'tones' | 'silent', platform: string, haptics = true, silentLocked: 'pause' | 'tones' = 'pause') =>
    lockBehavior({ mode, haptics, silentLocked, platform });

  it('keeps guiding with Voice and Tones on both platforms', () => {
    expect(at('voice', 'ios')).toBe('voice');
    expect(at('tones', 'android', false)).toBe('tones');
  });

  it('pauses Silent on iPhone unless soft tones were chosen', () => {
    expect(at('silent', 'ios')).toBe('pauses');
    expect(at('silent', 'ios', true, 'tones')).toBe('softTones');
  });

  it('keeps Silent going on Android only with haptics', () => {
    expect(at('silent', 'android', true)).toBe('haptics');
    expect(at('silent', 'android', false)).toBe('pauses');
  });

  it('says so, and offers the lock tip only when practice keeps going', () => {
    expect(MODE_HELP.pauses).toContain('pauses the practice');
    expect(MODE_HELP.haptics).toContain('haptics keep guiding');
    expect(LOCK_TIP.pauses).toBeNull();
    expect(LOCK_TIP.voice).toBe('You can lock your phone. The voice keeps guiding.');
  });
});

describe('speech owner', () => {
  it('gives speech to the Viram voice only with a screen reader and Voice cues', () => {
    expect(speechOwner({ screenReader: true, mode: 'voice' })).toBe('viram');
    expect(speechOwner({ screenReader: true, mode: 'tones' })).toBe('screenReader');
    expect(speechOwner({ screenReader: true, mode: 'silent' })).toBe('screenReader');
    expect(speechOwner({ screenReader: false, mode: 'voice' })).toBe('screenReader');
  });

  it('names the platform’s screen reader', () => {
    expect(screenReaderNote('ios')).toContain('VoiceOver');
    expect(screenReaderNote('android')).toContain('TalkBack');
  });
});
