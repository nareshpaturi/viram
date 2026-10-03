import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { colors } from '../theme';
import { everydayWash, type WashName } from './washes';

const LightContext = createContext<WashName | null>(null);

/** The wash the current screen sits on, or null on plain paper. */
export const useWash = () => useContext(LightContext);

export function LightProvider({ wash, children }: { wash: WashName | null; children: ReactNode }) {
  return <LightContext.Provider value={wash}>{children}</LightContext.Provider>;
}

const FrostContext = createContext(false);

/** True inside a frosted card or tile, which sits between its content and the wash. */
export const useFrosted = () => useContext(FrostContext);

/**
 * Marks content as sitting on a frosted surface. There the brand's muted
 * grey keeps 4.5:1 over every wash (scripts/check-theme-contrast.mjs), so
 * it isn't darkened as it is directly on a wash.
 */
export function Frosted({ children }: { children: ReactNode }) {
  return <FrostContext.Provider value>{children}</FrostContext.Provider>;
}

/**
 * The hour's wash, decided when the screen opens and again when Viram
 * comes back to the foreground; it never changes under a practitioner's eyes.
 */
export function useEverydayWash(): Exclude<WashName, 'night'> {
  const [wash, setWash] = useState(() => everydayWash(new Date()));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setWash(everydayWash(new Date()));
    });
    return () => subscription.remove();
  }, []);
  return wash;
}

// ——— Reduce Transparency (iOS): frosted surfaces become solid ———

let reduceTransparency = false;
const listeners = new Set<() => void>();
let subscribed = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!subscribed) {
    subscribed = true;
    const set = (value: boolean) => {
      if (value === reduceTransparency) return;
      reduceTransparency = value;
      listeners.forEach((l) => l());
    };
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(set)
      .catch(() => undefined);
    AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', set);
  }
  return () => listeners.delete(listener);
}

export const useReduceTransparency = () => useSyncExternalStore(subscribe, () => reduceTransparency);

/**
 * Frosted fill and outline for a control on the current surface. On a wash,
 * outlines darken to keep 3:1 at the glows; Reduce Transparency makes the
 * fill solid.
 */
export function useGlass(): { fill: string; rim: string; outline: string; solid: boolean } {
  const wash = useWash();
  const frosted = useFrosted();
  const solid = useReduceTransparency();
  return {
    fill: solid ? colors.surface : colors.glass,
    rim: solid ? colors.divider : colors.glassRim,
    outline: wash && wash !== 'night' && !frosted ? colors.outlineOnWash : colors.outline,
    solid,
  };
}
