import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NativeWidget from '../../modules/viram-widget';
import type { Preferences } from '../settings/preferences';
import { usePreferences } from '../settings/PreferencesProvider';
import { stores } from '../storage';
import { widgetData } from './widget';

/** Redraws the widget now: after a practice is saved, or a program moves on. */
export function refreshWidget(preferences: Preferences): void {
  if (!NativeWidget) return;
  try {
    NativeWidget.setWidget(JSON.stringify(widgetData(preferences, stores())));
  } catch {
    // The widget keeps what it had.
  }
}

/** Keeps the widget on Breathe's practice; the native side skips unchanged data. */
export function WidgetBridge() {
  const { preferences } = usePreferences();
  const latest = useRef(preferences);
  latest.current = preferences;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // A program, My rhythms, or History may have changed while away.
      if (state === 'background' || state === 'active') refreshWidget(latest.current);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    refreshWidget(preferences);
  }, [preferences]);

  return null;
}
