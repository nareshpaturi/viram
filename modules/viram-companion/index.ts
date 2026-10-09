/**
 * The phone's side of the watch companion (src/companion/companion.ts):
 * WatchConnectivity on iOS, the Wear OS Data Layer on Android. Sessions
 * from the watch wait natively until JS has saved them, so none is lost if
 * Viram isn't running when they arrive. Null where the module isn't built
 * in (web, tests).
 */
import { NativeModule, requireOptionalNativeModule } from 'expo';

/** none: no watch; paired: a watch without Viram; installed: Viram is on the watch. */
export type WatchState = 'none' | 'paired' | 'installed';

type CompanionEvents = {
  /** New sessions are waiting; read them with pendingSessions(). */
  onSessions: () => void;
};

declare class ViramCompanionModule extends NativeModule<CompanionEvents> {
  watchState(): Promise<WatchState>;
  /**
   * Replaces what the watch has; delivered even if the watch app isn't
   * running. False when it wasn't sent (no watch, or the link isn't up yet).
   */
  sendContext(json: string): Promise<boolean>;
  /** WatchSession JSON strings, oldest first. */
  pendingSessions(): string[];
  /** Forgets sessions by id once they are saved (or found invalid). */
  acknowledge(ids: string[]): void;
}

export default requireOptionalNativeModule<ViramCompanionModule>('ViramCompanion');
