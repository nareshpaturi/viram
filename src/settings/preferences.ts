/**
 * User preferences (FR-03, FR-13, and the PRD data model). Stored as one
 * JSON value per key; anything unreadable falls back to its default.
 */
import { Platform } from 'react-native';
import { STEP_KINDS } from '../breathing/rhythm';
import type { CueMode, HapticStrength, ToneSet } from '../breathing/timeline';
import { DEFAULT_HAPTIC_PHASES, type HapticPhases, type HapticStyle } from '../haptics/patterns';
import type { NightSetting } from '../night/surface';
import type { Db } from '../storage/db';
import { parsePractice, type Practice } from '../practice/practice';

export type OtherAudio = 'alongside' | 'pause';
export type Introductions = 'first' | 'always' | 'never';
export type Motion = 'system' | 'reduced';
export type IntroLength = 'short' | 'long';
/** FR-17: one local reminder a day, off until the practitioner turns it on. */
export interface Reminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface Preferences {
  firstUseComplete: boolean;
  cueMode: CueMode;
  haptics: boolean;
  hapticStrength: HapticStrength;
  /** How each step feels (src/haptics/patterns.ts). */
  hapticStyle: HapticStyle;
  /** Which steps get a haptic; the exhale's can be turned off, for example. */
  hapticPhases: HapticPhases;
  /** 0–1, relative to the device's media volume. */
  cueVolume: number;
  otherAudio: OtherAudio;
  toneSet: ToneSet;
  keepScreenOn: boolean;
  introductions: Introductions;
  /** Technique IDs whose introduction has played once. */
  introductionsHeard: string[];
  motion: Motion;
  /** The settle screen says once that the phone can be locked. */
  lockTipSeen: boolean;
  lastPractice: Practice | null;
  /** Technique IDs whose progression offers were turned off (FR-15). */
  progressionStopped: string[];
  /** “Not now”: per technique, only sessions after this time count toward the next offer. */
  progressionSnoozed: Record<string, number>;
  reminder: Reminder;
  /** The completion screen has offered the reminder once (src/reminder/offer.ts). */
  reminderOffered: boolean;
  /** FR-23: Off, 9 PM–6 AM, or Always. */
  nightPractice: NightSetting;
  /** FR-19: count each second within a step (Voice mode). */
  voiceCounting: boolean;
  /** FR-19: the short or the longer spoken introduction. */
  introLength: IntroLength;
  /** FR-18: the practitioner chose to add sessions to Apple Health / Health Connect. */
  healthConnected: boolean;
  /** “Not now” on the Health offer: it isn't offered after practices again (Settings still is). */
  healthDismissed: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  firstUseComplete: false,
  cueMode: 'voice',
  haptics: true,
  hapticStrength: 'medium',
  hapticStyle: 'marks',
  hapticPhases: DEFAULT_HAPTIC_PHASES,
  cueVolume: 0.8,
  // iOS shows lock-screen controls only for a session that pauses other audio
  // (docs/decisions/locked-audio.md), so that is its default. Android keeps
  // “Play along”: its media notification works either way and cues duck music.
  otherAudio: Platform.OS === 'ios' ? 'pause' : 'alongside',
  toneSet: 'soft-bells',
  keepScreenOn: false,
  introductions: 'first',
  introductionsHeard: [],
  motion: 'system',
  lockTipSeen: false,
  lastPractice: null,
  progressionStopped: [],
  progressionSnoozed: {},
  reminder: { enabled: false, hour: 7, minute: 30 },
  reminderOffered: false,
  nightPractice: 'off',
  healthConnected: false,
  healthDismissed: false,
  voiceCounting: false,
  introLength: 'short',
};

const oneOf =
  <T extends string>(...values: T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as string[]).includes(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

const VALIDATORS: { [K in keyof Preferences]: (v: unknown) => Preferences[K] | undefined } = {
  firstUseComplete: (v) => (isBoolean(v) ? v : undefined),
  cueMode: (v) => (oneOf('voice', 'tones', 'silent')(v) ? v : undefined),
  haptics: (v) => (isBoolean(v) ? v : undefined),
  hapticStrength: (v) => (oneOf('light', 'medium', 'strong')(v) ? v : undefined),
  hapticStyle: (v) => (oneOf('marks', 'through')(v) ? v : undefined),
  hapticPhases: (v) => {
    const p = v as HapticPhases;
    return typeof v === 'object' && v !== null && STEP_KINDS.every((k) => isBoolean(p[k]))
      ? { inhale: p.inhale, hold: p.hold, exhale: p.exhale, rest: p.rest }
      : undefined;
  },
  cueVolume: (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : undefined),
  otherAudio: (v) => (oneOf('alongside', 'pause')(v) ? v : undefined),
  toneSet: (v) => (oneOf('soft-bells', 'wood', 'chimes')(v) ? v : undefined),
  keepScreenOn: (v) => (isBoolean(v) ? v : undefined),
  introductions: (v) => (oneOf('first', 'always', 'never')(v) ? v : undefined),
  introductionsHeard: (v) =>
    Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]).slice(0, 50) : undefined,
  motion: (v) => (oneOf('system', 'reduced')(v) ? v : undefined),
  lockTipSeen: (v) => (isBoolean(v) ? v : undefined),
  lastPractice: (v) => (v === null ? null : (parsePractice(v) ?? undefined)),
  progressionStopped: (v) =>
    Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]).slice(0, 50) : undefined,
  progressionSnoozed: (v) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number' && Number.isFinite(x))
      ? (v as Record<string, number>)
      : undefined,
  nightPractice: (v) => (oneOf('off', 'evening', 'always')(v) ? v : undefined),
  healthConnected: (v) => (isBoolean(v) ? v : undefined),
  voiceCounting: (v) => (isBoolean(v) ? v : undefined),
  introLength: (v) => (oneOf('short', 'long')(v) ? v : undefined),
  healthDismissed: (v) => (isBoolean(v) ? v : undefined),
  reminderOffered: (v) => (isBoolean(v) ? v : undefined),
  reminder: (v) => {
    const r = v as Reminder;
    return typeof v === 'object' && v !== null && isBoolean(r.enabled) && isInt(r.hour, 0, 23) && isInt(r.minute, 0, 59)
      ? { enabled: r.enabled, hour: r.hour, minute: r.minute }
      : undefined;
  },
};

export const PREFERENCE_KEYS = Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[];

/** Keeps only known keys with valid values; used for storage reads and imports. */
export function parsePreferences(raw: Record<string, unknown>): Partial<Preferences> {
  const out: Partial<Record<keyof Preferences, unknown>> = {};
  for (const key of PREFERENCE_KEYS) {
    if (!(key in raw)) continue;
    const value = VALIDATORS[key](raw[key]);
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<Preferences>;
}

export function preferencesRepository(db: Db) {
  return {
    read(): Preferences {
      const raw: Record<string, unknown> = {};
      for (const row of db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM preferences', [])) {
        try {
          raw[row.key] = JSON.parse(row.value);
        } catch {
          // Unreadable values fall back to their defaults.
        }
      }
      return { ...DEFAULT_PREFERENCES, ...parsePreferences(raw) };
    },

    /** Each key is its own row, so a partial write never leaves a value half-written. */
    write(patch: Partial<Preferences>): void {
      for (const key of PREFERENCE_KEYS) {
        if (!(key in patch)) continue;
        db.runSync('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [key, JSON.stringify(patch[key])]);
      }
    },
  };
}

export type PreferencesRepository = ReturnType<typeof preferencesRepository>;
