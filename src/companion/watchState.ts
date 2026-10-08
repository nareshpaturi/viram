import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import NativeCompanion, { type WatchState } from '../../modules/viram-companion';

export const WATCH_NAME = Platform.OS === 'android' ? 'Wear OS' : 'Apple Watch';

/** The paired watch, read whenever the screen comes into focus; 'none' without the module. */
export function useWatchState(): WatchState {
  const [state, setState] = useState<WatchState>('none');
  useFocusEffect(
    useCallback(() => {
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
