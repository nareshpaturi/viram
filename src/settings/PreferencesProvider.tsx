import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { stores } from '../storage';
import type { Preferences } from './preferences';

interface PreferencesContext {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
}

const Context = createContext<PreferencesContext | null>(null);

/**
 * One in-memory copy of the preferences, written through to storage, so the
 * cue chip on Breathe and Settings always agree.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => stores().preferences.read());
  const update = useCallback((patch: Partial<Preferences>) => {
    stores().preferences.write(patch);
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);
  const value = useMemo(() => ({ preferences, update }), [preferences, update]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePreferences(): PreferencesContext {
  const context = useContext(Context);
  if (!context) throw new Error('usePreferences needs PreferencesProvider');
  return context;
}
