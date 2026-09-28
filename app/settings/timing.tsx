import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { audioAvailable } from '../../src/audio/guide';
import { TARGET_MS, currentTimingLog, summarize, timingCsv, type TimingLog } from '../../src/audio/timingLog';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { Stat, StatRow } from '../../src/components/Stat';
import { colors, spacing } from '../../src/theme';

const ms = (value: number) => {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded)} ms`;
};

/**
 * Developer only: cue timing from the last practice, for the locked-screen
 * evidence in docs/decisions/locked-audio.md. Not in store builds.
 */
export default function CueTiming() {
  const [log, setLog] = useState<TimingLog | null>(null);
  const [, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setLog(currentTimingLog());
      // Entries keep arriving while a practice runs elsewhere in the stack.
      const timer = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(timer);
    }, []),
  );

  if (!audioAvailable()) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText>Cue timing needs the native guide module, so it isn’t measured in this build.</AppText>
      </Screen>
    );
  }
  if (!log) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">No practice measured yet.</AppText>
        <AppText>
          Begin a practice with Voice or Tones, lock the phone if you’re testing locked guidance, and let it finish. Then come back here. Each cue’s
          drift is how far from its planned time it actually reached the speaker.
        </AppText>
      </Screen>
    );
  }

  const summary = summarize(log.entries);
  const recent = [...log.entries].reverse().slice(0, 200);
  return (
    <Screen
      edges={['left', 'right']}
      footer={<Button title="Share log (CSV)" onPress={() => Share.share({ message: timingCsv(log) }).catch(() => undefined)} />}
    >
      <AppText variant="heading">{log.practice}</AppText>
      <AppText variant="label">
        {log.details} · started {new Date(log.startedAt).toLocaleTimeString()}
      </AppText>
      {summary ? (
        <>
          <StatRow>
            <Stat value={`${Math.round(summary.withinTarget * 100)}%`} label={`Cues within ±${TARGET_MS} ms`} />
            <Stat value={summary.endDriftMs === null ? '—' : ms(summary.endDriftMs)} label="End (completion cue)" />
          </StatRow>
          <Card>
            <AppText variant="label">
              {summary.cues} cues · mean |drift| {Math.round(summary.meanAbsMs)} ms · p95 {Math.round(summary.p95AbsMs)} ms · max{' '}
              {Math.round(summary.maxAbsMs)} ms
            </AppText>
          </Card>
        </>
      ) : (
        <AppText>No cues measured yet. Silent mode plays no cues to measure.</AppText>
      )}
      <View style={styles.list}>
        {recent.map((entry, i) =>
          entry.kind === 'cue' ? (
            <AppText key={i} variant="label" style={Math.abs(entry.driftMs) > TARGET_MS ? styles.late : undefined}>
              {entry.segment} · {(entry.atMs / 1000).toFixed(1)} s · {ms(entry.driftMs)} · {entry.sound}
            </AppText>
          ) : (
            <AppText key={i} variant="label" style={styles.mark}>
              {entry.segment} · {entry.label}
            </AppText>
          ),
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  late: { color: colors.danger },
  mark: { color: colors.pine },
});
