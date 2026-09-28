import type { ToneSet } from '../breathing/timeline';

export const TONE_SET_LABEL: Record<ToneSet, string> = { 'soft-bells': 'Soft bells', wood: 'Wood', chimes: 'Chimes' };
export const TONE_SETS = Object.keys(TONE_SET_LABEL) as ToneSet[];
