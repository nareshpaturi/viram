/**
 * Background music: a bed looped softly under a practice's cues, in the same
 * key as the tone sets (scripts/render-music.mjs). Silent stays silent.
 */
export type Music = 'off' | 'tanpura' | 'pad';

export const MUSIC_LABEL: Record<Music, string> = { off: 'Off', tanpura: 'Tanpura', pad: 'Soft pad' };
export const MUSIC_CHOICES = Object.keys(MUSIC_LABEL) as Music[];

/** How long choosing a bed in Settings plays it for. */
export const MUSIC_PREVIEW_MS = 8000;

export const musicSound = (music: Exclude<Music, 'off'>) => `music.${music}`;
