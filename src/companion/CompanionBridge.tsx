import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NativeCompanion from '../../modules/viram-companion';
import { flushHealth } from '../health/health';
import { refreshQuickActions } from '../quickstart/QuickActionsBridge';
import type { Preferences } from '../settings/preferences';
import { usePreferences } from '../settings/PreferencesProvider';
import { stores } from '../storage';
import { saveWatchSessions, watchContext } from './watchPractices';

let lastSent: string | null = null;
/** The bridge's preferences, for refreshWatch() from screens that change My rhythms or programs. */
let current: Preferences | null = null;

/** Sends the watch its practices and haptic settings, unless they're what it already has. */
function sendToWatch(preferences: Preferences): void {
  if (!NativeCompanion) return;
  try {
    const context = watchContext(preferences, stores(), Date.now());
    const key = JSON.stringify({ ...context, sentAt: 0 });
    if (key === lastSent) return;
    lastSent = key;
    // Not sent (the link isn't up yet, or there's no watch): try again next time.
    const retry = () => {
      if (lastSent === key) lastSent = null;
    };
    NativeCompanion.sendContext(JSON.stringify(context))
      .then((sent) => {
        if (!sent) retry();
      })
      .catch(retry);
  } catch {
    // The watch catches up next time.
  }
}

/**
 * Sends the watch what changed after My rhythms or a program changes, while
 * Viram stays open (QA W07). Unchanged practices aren't sent again.
 */
export function refreshWatch(preferences: Preferences | null = current): void {
  if (preferences) sendToWatch(preferences);
}

/** Saves what the watch sent to History (and Health, when connected). */
function receiveFromWatch(preferences: Preferences): void {
  if (!NativeCompanion) return;
  try {
    const pending = NativeCompanion.pendingSessions();
    if (!pending.length) return;
    const { saved, ids } = saveWatchSessions(pending, stores(), preferences, Date.now());
    NativeCompanion.acknowledge(ids);
    if (saved.length) {
      refreshQuickActions(preferences);
      if (preferences.healthConnected) flushHealth(stores()).catch(() => undefined);
      // A program session done on the watch moves the program on.
      if (saved.some((r) => r.program)) sendToWatch(preferences);
    }
  } catch {
    // Left pending; tried again on the next foreground.
  }
}

/**
 * Keeps Viram on the watch in step with the phone (research gap 4): the
 * practices and haptic settings go whenever they change (screens that change
 * My rhythms or programs call refreshWatch) or Viram comes back to the
 * foreground, and the sessions the watch sends back are saved as they arrive.
 */
export function CompanionBridge() {
  const { preferences } = usePreferences();
  const latest = useRef(preferences);
  latest.current = preferences;
  current = preferences;

  useEffect(() => {
    if (!NativeCompanion) return;
    receiveFromWatch(latest.current);
    const sessions = NativeCompanion.addListener('onSessions', () => receiveFromWatch(latest.current));
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      sendToWatch(latest.current);
      receiveFromWatch(latest.current);
    });
    return () => {
      sessions.remove();
      appState.remove();
    };
  }, []);

  const key = JSON.stringify([preferences.lastPractice, preferences.hapticStyle, preferences.hapticPhases]);
  useEffect(() => {
    sendToWatch(preferences);
    // Only when Breathe's practice or the haptic settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
