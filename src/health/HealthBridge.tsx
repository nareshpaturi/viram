import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePreferences } from '../settings/PreferencesProvider';
import { stores } from '../storage';
import { flushHealth } from './health';

/**
 * Retries sessions still waiting to be added to Health (FR-18) at launch
 * and whenever Viram comes back to the foreground. Failed writes are left
 * for the retry in Settings, so nothing loops.
 */
export function HealthBridge() {
  const { preferences } = usePreferences();
  const connected = useRef(preferences.healthConnected);
  connected.current = preferences.healthConnected;

  useEffect(() => {
    const flush = () => {
      if (connected.current) flushHealth(stores()).catch(() => undefined);
    };
    flush();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && flush());
    return () => subscription.remove();
  }, []);

  return null;
}
