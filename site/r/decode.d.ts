export interface WebPractice {
  name: string;
  steps: { kind: 'inhale' | 'hold' | 'exhale' | 'rest'; seconds: number; side?: 'left' | 'right'; cue?: 'hum' }[];
  target: { minutes: number } | { rounds: number };
  technique: { id: string; name: string; subtitle: string } | null;
}
export function decodePayload(payload: string): WebPractice | null;
export function describeSteps(steps: WebPractice['steps']): string;
export function describeTarget(target: WebPractice['target']): string;
