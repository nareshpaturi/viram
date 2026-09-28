import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import {
  flushHealth,
  HEALTH_NAME,
  HEALTH_RESULT,
  healthAuthorization,
  healthAvailable,
  requestHealthAuthorization,
  writeToHealth,
} from '../src/health/health';
import type { HealthState } from '../src/history/repository';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, spacing } from '../src/theme';

type Mode = { kind: 'offer' } | { kind: 'asking' } | { kind: 'result'; state: Exclude<HealthState, 'none'> } | { kind: 'manage' };

/**
 * Apple Health / Health Connect (FR-18): context first, then the real
 * system permission, then one honest result. From Settings, the same
 * screen shows the connection and retries sessions that couldn't be added.
 */
export default function Health() {
  const params = useLocalSearchParams<{ record?: string }>();
  const { preferences, update } = usePreferences();
  const [mode, setMode] = useState<Mode>(preferences.healthConnected && !params.record ? { kind: 'manage' } : { kind: 'offer' });
  const [counts, setCounts] = useState({ failed: 0, pending: 0 });
  const [revoked, setRevoked] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const refreshCounts = useCallback(() => {
    const history = stores().history;
    setCounts({ failed: history.withHealth('failed').length, pending: history.withHealth('pending').length });
  }, []);
  useEffect(() => {
    if (mode.kind !== 'manage') return;
    refreshCounts();
    healthAuthorization().then((a) => setRevoked(a !== 'authorized'));
  }, [mode.kind, refreshCounts]);

  const connect = async () => {
    if (!healthAvailable()) return setMode({ kind: 'result', state: 'unavailable' });
    setMode({ kind: 'asking' });
    const authorization = await requestHealthAuthorization();
    const record = params.record ? stores().history.get(params.record) : null;
    if (authorization !== 'authorized') {
      if (record) stores().history.setHealth(record.id, authorization === 'unavailable' ? 'unavailable' : 'declined');
      update({ healthDismissed: true });
      return setMode({ kind: 'result', state: authorization === 'unavailable' ? 'unavailable' : 'declined' });
    }
    update({ healthConnected: true, healthDismissed: false });
    if (!record) return setMode({ kind: 'manage' });
    const state = await writeToHealth(stores(), record);
    const shown = state === 'none' ? 'pending' : state;
    setMode({ kind: 'result', state: shown });
    AccessibilityInfo.announceForAccessibility(HEALTH_RESULT[shown].title);
  };

  const notNow = () => {
    update({ healthDismissed: true });
    setMode({ kind: 'result', state: 'declined' });
  };

  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (mode.kind === 'asking') {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading" accessibilityRole="header">
          Permission is handled by your device.
        </AppText>
        <AppText style={styles.muted}>Return to Viram after choosing in {HEALTH_NAME}.</AppText>
      </Screen>
    );
  }

  if (mode.kind === 'result') {
    const { title, body } = HEALTH_RESULT[mode.state];
    return (
      <Screen edges={['left', 'right']} footer={<Button title="Done" onPress={done} />}>
        <Mark />
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText style={styles.muted}>{body}</AppText>
        <Card muted>
          <AppText variant="bodyStrong">✓ Saved on this device</AppText>
          <AppText variant="label">Local history is independent of Health.</AppText>
        </Card>
      </Screen>
    );
  }

  if (mode.kind === 'manage') {
    const waiting = counts.failed + counts.pending;
    return (
      <Screen edges={['left', 'right']}>
        <Mark />
        <AppText variant="title" accessibilityRole="header">
          {revoked ? `${HEALTH_NAME} isn’t allowed.` : `Adding sessions to ${HEALTH_NAME}.`}
        </AppText>
        <AppText style={styles.muted}>
          {revoked
            ? `Viram no longer has permission to add sessions. Your practice is saved here either way.`
            : 'Each completed practice of a minute or more is added once. Viram saves practice time only and never reads health measurements.'}
        </AppText>
        {revoked ? (
          <Button
            title={Platform.OS === 'ios' ? 'Open Health settings' : 'Open Health Connect'}
            variant="secondary"
            onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'x-apple-health://' : 'healthconnect://').catch(() => Linking.openSettings())}
          />
        ) : null}
        {waiting > 0 ? (
          <Card>
            <AppText variant="bodyStrong">
              {waiting} {waiting === 1 ? 'session hasn’t' : 'sessions haven’t'} been added yet.
            </AppText>
            <AppText variant="label">They’re safe in local History.</AppText>
            <Button
              title={retrying ? 'Trying…' : 'Try again'}
              variant="secondary"
              disabled={retrying || revoked}
              onPress={async () => {
                setRetrying(true);
                const { written, left } = await flushHealth(stores(), { includeFailed: true });
                setRetrying(false);
                refreshCounts();
                AccessibilityInfo.announceForAccessibility(left === 0 ? `Added ${written} to ${HEALTH_NAME}.` : `${left} still couldn’t be added.`);
              }}
            />
          </Card>
        ) : null}
        <Button
          title="Stop adding sessions"
          variant="secondary"
          onPress={() => {
            update({ healthConnected: false });
            setMode({ kind: 'offer' });
            AccessibilityInfo.announceForAccessibility(`Viram will stop adding sessions to ${HEALTH_NAME}.`);
          }}
        />
        <AppText variant="label">
          Sessions already in {HEALTH_NAME} stay there. To remove Viram’s access, use {Platform.OS === 'ios' ? 'the Health app' : 'Health Connect settings'}.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button title="Continue" onPress={connect} />
          <Button title="Not now" variant="secondary" onPress={notNow} />
        </>
      }
    >
      <Mark />
      <AppText variant="title" accessibilityRole="header">
        Add sessions{'\n'}to {HEALTH_NAME}?
      </AppText>
      <AppText>Keep completed breathing practices alongside your other mindful activity.</AppText>
      <AppText style={styles.muted}>Viram saves practice time only. It does not read heart rate or other health measurements.</AppText>
      <AppText variant="label">Your practice is saved here either way.</AppText>
    </Screen>
  );
}

function Mark() {
  return (
    <View style={styles.mark} importantForAccessibility="no">
      <AppText variant="heading" style={styles.heart}>
        ♡
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  heart: { color: colors.coralDeep },
});
