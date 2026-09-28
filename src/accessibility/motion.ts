import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { Motion } from '../settings/preferences';

/** Motion follows the system unless the person chose Reduced in Settings. */
export function useReducedMotion(setting: Motion): boolean {
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setSystem(value)).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return setting === 'reduced' || system;
}
