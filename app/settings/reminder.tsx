import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Linking, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { Stepper } from '../../src/components/Stepper';
import { SwitchRow } from '../../src/components/SwitchRow';
import { readyPractice } from '../../src/practice/ready';
import {
  askForReminderPermission,
  REMINDER_TITLE,
  reminderBody,
  reminderPermission,
  reminderTime,
  type ReminderPermission,
} from '../../src/reminder/reminder';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors, radius, spacing } from '../../src/theme';

const PRESETS = [
  { hour: 6, minute: 30 },
  { hour: 7, minute: 30 },
  { hour: 12, minute: 30 },
  { hour: 21, minute: 0 },
];
const STEP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;

/**
 * Daily reminder (FR-17): off by default, previewed before it's turned on.
 * The system permission is asked only when the switch is turned on; if it
 * was refused, the screen says so and links to system settings.
 */
export default function ReminderSettings() {
  const { preferences, update } = usePreferences();
  const { reminder } = preferences;
  const [permission, setPermission] = useState<ReminderPermission | null>(null);
  const [asking, setAsking] = useState(false);

  const check = useCallback(() => {
    reminderPermission()
      .then(setPermission)
      .catch(() => setPermission('undetermined'));
  }, []);
  useEffect(() => {
    check();
    // Coming back from system settings may have changed the answer.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => subscription.remove();
  }, [check]);

  const denied = permission === 'denied';
  const on = reminder.enabled && permission === 'granted';
  const at = reminder.hour * 60 + reminder.minute;
  const setTime = (minutes: number) => {
    const m = (minutes + DAY_MINUTES) % DAY_MINUTES;
    update({ reminder: { ...reminder, hour: Math.floor(m / 60), minute: m % 60 } });
  };

  const toggle = async (value: boolean) => {
    if (!value) {
      update({ reminder: { ...reminder, enabled: false } });
      AccessibilityInfo.announceForAccessibility('Daily reminder off');
      return;
    }
    setAsking(true);
    try {
      const granted = await askForReminderPermission();
      setPermission(granted ? 'granted' : 'denied');
      update({ reminder: { ...reminder, enabled: granted } });
      AccessibilityInfo.announceForAccessibility(granted ? `Daily reminder on at ${reminderTime(reminder)}` : 'Notifications are off for Viram');
    } catch {
      setPermission('undetermined');
    } finally {
      setAsking(false);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <SwitchRow label="Remind me" description="Once a day" value={on || asking} onChange={toggle} />
      {denied ? (
        <Card muted>
          <AppText variant="bodyStrong" accessibilityRole="alert">
            Notifications are off for Viram.
          </AppText>
          <AppText>To get the reminder, allow notifications for Viram in your device settings, then turn it on here.</AppText>
          <Button title="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} />
        </Card>
      ) : null}
      <AppText variant="overline" accessibilityRole="header">
        TIME
      </AppText>
      <AppText variant="label">Your local time</AppText>
      <Segmented
        label="Reminder time"
        wrap
        value={at}
        onChange={setTime}
        options={PRESETS.map((p) => ({ value: p.hour * 60 + p.minute, label: reminderTime(p) }))}
      />
      <Stepper
        label="Time"
        display={reminderTime(reminder)}
        spoken={reminderTime(reminder)}
        hint="Changes by 15 minutes"
        canDecrement
        canIncrement
        onDecrement={() => setTime(at - STEP_MINUTES)}
        onIncrement={() => setTime(at + STEP_MINUTES)}
      />
      <AppText variant="overline" accessibilityRole="header">
        PREVIEW
      </AppText>
      <View
        style={styles.preview}
        accessible
        accessibilityLabel={`Preview: ${REMINDER_TITLE} ${reminderBody(readyPractice(preferences, stores()))}`}
      >
        <AppText variant="label">Viram</AppText>
        <AppText variant="bodyStrong">{REMINDER_TITLE}</AppText>
        <AppText>{reminderBody(readyPractice(preferences, stores()))}</AppText>
      </View>
      <AppText variant="label">
        Viram asks for notification permission only after you turn this on. One reminder a day, and nothing else. Tapping it opens Breathe; it never starts a
        practice on its own.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: 2,
  },
});
