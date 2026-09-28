import type { Href } from 'expo-router';
import type { Practice } from './practice';
import { singleRun, type PracticeRun } from './run';

const asRun = (subject: Practice | PracticeRun): PracticeRun => ('parts' in subject ? subject : singleRun(subject));

/**
 * Where Begin goes. The run travels as a route param and is validated again
 * on arrival. Quick actions skip introductions (FR-12).
 */
export function practiceHref(subject: Practice | PracticeRun, options: { quickStart?: boolean } = {}): Href {
  return {
    pathname: '/practice',
    params: { run: JSON.stringify(asRun(subject)), ...(options.quickStart ? { quick: '1' } : {}) },
  };
}

/** The same destination as a path string, for continuing after first use. */
export function practicePath(subject: Practice | PracticeRun, options: { quickStart?: boolean } = {}): string {
  return `/practice?run=${encodeURIComponent(JSON.stringify(asRun(subject)))}${options.quickStart ? '&quick=1' : ''}`;
}
