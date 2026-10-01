import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { Stepper } from '../../src/components/Stepper';
import { SwitchRow } from '../../src/components/SwitchRow';
import { findProgram } from '../../src/programs/definitions';
import { PRACTICE_TIMES, start, type PracticePlan, type PracticeTime } from '../../src/programs/engine';
import { askForReminderPermission, reminderTime } from '../../src/reminder/reminder';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors, radius, spacing, touchTarget } from '../../src/theme';

const DAY_MINUTES = 24 * 60;

/**
 * Starting a program (FR-20): when the practitioner will practise, and the
 * optional daily reminder (FR-17). Both can be skipped; the program works
 * without notification permission.
 */
export default function StartProgram() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = id ? findProgram(id) : undefined;
  const { preferences, update } = usePreferences();
  const [time, setTime] = useState<PracticeTime | null>(null);
  const [custom, setCustom] = useState({ hour: 18, minute: 0 });
  const [remind, setRemind] = useState(false);
  const [denied, setDenied] = useState(false);

  if (!program) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">This program isn’t available.</AppText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const plan: PracticePlan | null = time === null ? null : time === 'custom' ? { time, ...custom } : { time, hour: PRACTICE_TIMES[time].hour, minute: PRACTICE_TIMES[time].minute };
  const shiftCustom = (by: number) => {
    const m = (custom.hour * 60 + custom.minute + by + DAY_MINUTES) % DAY_MINUTES;
    setCustom({ hour: Math.floor(m / 60), minute: m % 60 });
  };

  const toggleRemind = async (on: boolean) => {
    if (!on) return setRemind(false);
    const granted = await askForReminderPermission().catch(() => false);
    setRemind(granted);
    setDenied(!granted);
  };

  const begin = (withPlan: boolean) => {
    const now = Date.now();
    const programs = stores().programs;
    const existing = programs.forProgram(program.id);
    const chosen = withPlan ? plan : null;
    // One row per program: starting again reuses it from session 1.
    programs.activate(start(program, existing?.id ?? programs.newId(), chosen, now), now);
    if (withPlan && remind && chosen) update({ reminder: { enabled: true, hour: chosen.hour, minute: chosen.minute } });
    AccessibilityInfo.announceForAccessibility(`${program.name} started. Session 1 is ready on Breathe.`);
    router.dismissTo('/');
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button title="Start program" onPress={() => begin(true)} />
          <Button title="Skip for now" variant="secondary" onPress={() => begin(false)} />
        </>
      }
    >
      <AppText variant="title" accessibilityRole="header">
        When will you practise?
      </AppText>
      <AppText style={styles.muted}>A set time makes a plan easier to keep. You can change it anytime.</AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Practice time" style={styles.options}>
        {(Object.keys(PRACTICE_TIMES) as (keyof typeof PRACTICE_TIMES)[]).map((key) => (
          <Option key={key} selected={time === key} title={PRACTICE_TIMES[key].label} detail={PRACTICE_TIMES[key].detail} onPress={() => setTime(key)} />
        ))}
        <Option selected={time === 'custom'} title="Choose a time" detail={time === 'custom' ? reminderTime(custom) : 'Any time that suits you'} onPress={() => setTime('custom')} />
      </View>
      {time === 'custom' ? (
        <Stepper
          label="Time"
          display={reminderTime(custom)}
          spoken={reminderTime(custom)}
          hint="Changes by 15 minutes"
          canDecrement
          canIncrement
          onDecrement={() => shiftCustom(-15)}
          onIncrement={() => shiftCustom(15)}
        />
      ) : null}
      {plan ? (
        <SwitchRow label="Remind me" description={`One gentle reminder a day at ${reminderTime(plan)}`} value={remind} onChange={toggleRemind} />
      ) : null}
      {denied ? (
        <Card muted>
          <AppText>Notifications are off for Viram, so there won’t be a reminder. The program works just the same.</AppText>
        </Card>
      ) : null}
      {preferences.reminder.enabled && remind && plan ? (
        <AppText variant="label">This moves your daily reminder from {reminderTime(preferences.reminder)} to {reminderTime(plan)}.</AppText>
      ) : null}
      <AppText variant="label">Viram asks for notification permission only if you turn this on.</AppText>
    </Screen>
  );
}

function Option({ title, detail, selected, onPress }: { title: string; detail: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${title}, ${detail}`}
      style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
    >
      <AppText variant="bodyStrong" style={selected ? styles.selectedText : undefined}>
        {title}
      </AppText>
      <AppText variant="label" style={selected ? styles.selectedText : undefined}>
        {detail}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  options: { gap: spacing.sm },
  option: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 2,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.pine, borderColor: colors.pine },
  selectedText: { color: colors.white },
  pressed: { opacity: 0.85 },
});
