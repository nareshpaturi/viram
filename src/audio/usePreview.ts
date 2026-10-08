import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { currentPreview, startPreview, stopPreview, subscribePreview } from './guide';

/**
 * The screen's sound samples (UX10): which one is playing, and a toggle for
 * each play button. Leaving the screen or the app stops the sample.
 */
export function usePreview() {
  const playing = useSyncExternalStore(subscribePreview, currentPreview);
  useFocusEffect(useCallback(() => () => stopPreview(), []));
  // A sheet closing (the Guidance sheet's sample) stops it too.
  useEffect(() => () => stopPreview(), []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stopPreview();
    });
    return () => subscription.remove();
  }, []);
  const toggle = useCallback((key: string, sound: string, volume: number, maxMs?: number) => {
    if (currentPreview() === key) stopPreview();
    else void startPreview(key, sound, volume, maxMs);
  }, []);
  return { playing, toggle };
}
