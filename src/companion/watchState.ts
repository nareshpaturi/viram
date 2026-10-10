import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import NativeCompanion, { type WatchState } from '../../modules/viram-companion';

export const WATCH_NAME = Platform.OS === 'android' ? 'Wear OS' : 'Apple Watch';

/**
 * Whether this platform's watch app is in its store. Neither is yet: the
 * Apple Watch app is left out of 1.0 (app.json builds only the widget target)
 * until it has run on a real watch, and the Wear OS app isn't published. Until
 * then Settings doesn't offer a watch, so no one is sent looking for an app
 * that isn't there.
 */
export const WATCH_APP_AVAILABLE: boolean = false;

/** The paired watch, read whenever the screen comes into focus; 'none' without the module or a watch app. */
export function useWatchState(): WatchState {
  const [state, setState] = useState<WatchState>('none');
  useFocusEffect(
    useCallback(() => {
      if (!WATCH_APP_AVAILABLE) return undefined;
      let live = true;
      NativeCompanion?.watchState()
        .then((s) => live && setState(s))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );
  return state;
}
