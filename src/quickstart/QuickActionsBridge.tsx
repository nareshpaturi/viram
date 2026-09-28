import { useEffect, useRef } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';
import { practiceHref, practicePath } from '../practice/launch';
import { oneMinuteBox, parsePractice, type Practice } from '../practice/practice';
import { readyPractice } from '../practice/ready';
import type { Preferences } from '../settings/preferences';
import { usePreferences } from '../settings/PreferencesProvider';
import { stores } from '../storage';
import { quickActionItems, type QuickAction } from './quickActions';

/** Rebuilds the icon menu from the last practice and History. */
export function refreshQuickActions(preferences: Preferences): void {
  const s = stores();
  const last = preferences.lastPractice ? readyPractice(preferences, s) : null;
  const items = quickActionItems(last, s.history.list(50));
  QuickActions.setItems(items.map(({ id, title, subtitle, icon, params }) => ({ id, title, subtitle, icon, params }))).catch(() => undefined);
}

function exists(practice: Practice): boolean {
  return practice.source.kind !== 'rhythm' || stores().rhythms.get(practice.source.id) !== null;
}

/** The practice an action starts, or null when it no longer exists (open Breathe). */
function practiceFor(action: { id: string; params?: Record<string, unknown> | null }, preferences: Preferences): Practice | null {
  if (action.id === 'box') return oneMinuteBox();
  if (action.id === 'last') {
    const last = preferences.lastPractice;
    return last && exists(last) ? last : null;
  }
  try {
    const practice = parsePractice(JSON.parse(String(action.params?.practice ?? '')));
    return practice && exists(practice) ? practice : null;
  } catch {
    return null;
  }
}

/**
 * Routes a chosen action to the settle countdown (with Cancel), or through
 * first use when it isn't complete. Works on cold and warm launch.
 */
export function QuickActionsBridge() {
  const context = usePreferences();
  const latest = useRef(context);
  latest.current = context;

  useEffect(() => {
    refreshQuickActions(context.preferences);
  }, [context.preferences]);

  useEffect(() => {
    const open = (action: Pick<QuickAction, 'id'> & { params?: Record<string, unknown> | null }) => {
      const { preferences, update } = latest.current;
      const practice = practiceFor(action, preferences);
      if (!practice) {
        router.navigate('/');
        return;
      }
      if (!preferences.firstUseComplete) {
        router.navigate({ pathname: '/welcome', params: { next: practicePath(practice, { quickStart: true }) } });
        return;
      }
      update({ lastPractice: practice });
      router.navigate(practiceHref(practice, { quickStart: true }));
    };
    const initial = QuickActions.initial;
    // Let the navigator mount before a cold-start action routes.
    const timer = initial ? setTimeout(() => open(initial as never), 0) : undefined;
    const subscription = QuickActions.addListener((action) => open(action as never));
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return null;
}
