/**
 * User preferences (FR-03, FR-13, and the PRD data model). Stored as one
 * JSON value per key; anything unreadable falls back to its default.
 */
import type { CueMode, HapticStrength, ToneSet } from '../breathing/timeline';
import type { Db } from '../storage/db';
import { parsePractice, type Practice } from '../practice/practice';

export type OtherAudio = 'alongside' | 'pause';
export type Introductions = 'first' | 'always' | 'never';
export type Motion = 'system' | 'reduced';

export interface Preferences {
  firstUseComplete: boolean;
  cueMode: CueMode;
  haptics: boolean;
  hapticStrength: HapticStrength;
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
}

export const DEFAULT_PREFERENCES: Preferences = {
  firstUseComplete: false,
  cueMode: 'voice',
  haptics: true,
  hapticStrength: 'medium',
  cueVolume: 0.8,
  otherAudio: 'alongside',
  toneSet: 'soft-bells',
  keepScreenOn: false,
  introductions: 'first',
  introductionsHeard: [],
  motion: 'system',
  lockTipSeen: false,
  lastPractice: null,
};

const oneOf =
  <T extends string>(...values: T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as string[]).includes(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const VALIDATORS: { [K in keyof Preferences]: (v: unknown) => Preferences[K] | undefined } = {
  firstUseComplete: (v) => (isBoolean(v) ? v : undefined),
  cueMode: (v) => (oneOf('voice', 'tones', 'silent')(v) ? v : undefined),
  haptics: (v) => (isBoolean(v) ? v : undefined),
  hapticStrength: (v) => (oneOf('light', 'medium', 'strong')(v) ? v : undefined),
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
