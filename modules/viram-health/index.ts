/**
 * Write-only Apple Health / Health Connect session writing (FR-18). Null
 * where the native module isn't built in (web, tests).
 */
import { NativeModule, requireOptionalNativeModule } from 'expo';

export type HealthAvailability = 'available' | 'needsUpdate' | 'unavailable';
export type HealthAuthorization = 'notDetermined' | 'denied' | 'authorized' | 'unavailable';
export type HealthWriteResult = 'written' | 'declined' | 'unavailable' | 'failed';

declare class ViramHealthModule extends NativeModule {
  availability(): HealthAvailability;
  /** Sync on iOS, async on Android; await it either way. */
  authorization(): HealthAuthorization | Promise<HealthAuthorization>;
  requestAuthorization(): Promise<HealthAuthorization>;
  writeSession(id: string, startMs: number, endMs: number): Promise<HealthWriteResult>;
}

export default requireOptionalNativeModule<ViramHealthModule>('ViramHealth');
