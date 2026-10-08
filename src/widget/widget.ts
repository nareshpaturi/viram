/**
 * The “Breathe” home-screen widget (iOS targets/widget, Android
 * modules/viram-widget): Breathe's ready practice, or the next program
 * session, and a tap that opens its settle countdown, as a quick action does
 * (FR-12: no introduction; first use still comes first). “Practiced today”
 * comes from the day of the last practice; there are no streaks.
 */
import { describeRhythm, describeTarget } from '../breathing/describe';
import { practicePath } from '../practice/launch';
import { readyPractice } from '../practice/ready';
import { nextSessionNumber, sessionLine, sessionRun } from '../programs/engine';
import type { Preferences } from '../settings/preferences';
import type { Stores } from '../storage/stores';

export interface WidgetData {
  name: string;
  detail: string;
  url: string;
  /** Local “yyyy-mm-dd” of the most recent practice, or null. */
  lastPracticeDay: string | null;
}

export function localDay(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function widgetData(preferences: Preferences, stores: Pick<Stores, 'history' | 'programs' | 'rhythms'>): WidgetData {
  const last = stores.history.list(1)[0];
  const lastPracticeDay = last ? localDay(last.startedAt) : null;
  const enrollment = stores.programs.active();
  const number = enrollment ? nextSessionNumber(enrollment) : null;
  const run = enrollment && number ? sessionRun(enrollment.definition, number) : null;
  if (enrollment && number && run) {
    return {
      name: enrollment.definition.name,
      detail: `Session ${number} · ${sessionLine(enrollment.definition.sessions[number - 1])}`,
      url: `viram://${practicePath(run, { quickStart: true })}`,
      lastPracticeDay,
    };
  }
  const practice = readyPractice(preferences, stores as Stores);
  return {
    name: practice.name,
    detail: `${describeRhythm(practice.steps)} · ${describeTarget(practice.target)}`,
    url: `viram://${practicePath(practice, { quickStart: true })}`,
    lastPracticeDay,
  };
}
