import type { Href } from 'expo-router';
import type { Practice } from './practice';

/**
 * Where Begin goes. The practice travels as a route param and is validated
 * again on arrival. Quick actions skip introductions (FR-12).
 */
export function practiceHref(practice: Practice, options: { quickStart?: boolean } = {}): Href {
  return {
    pathname: '/practice',
    params: { practice: JSON.stringify(practice), ...(options.quickStart ? { quick: '1' } : {}) },
  };
}

/** The same destination as a path string, for continuing after first use. */
export function practicePath(practice: Practice, options: { quickStart?: boolean } = {}): string {
  return `/practice?practice=${encodeURIComponent(JSON.stringify(practice))}${options.quickStart ? '&quick=1' : ''}`;
}
