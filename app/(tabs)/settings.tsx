import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '../../src/components/AppText';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { MODE_LABEL } from '../../src/components/CueControls';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { TONE_SET_LABEL } from '../../src/audio/toneSets';
import { TIMING_LOG_ENABLED } from '../../src/audio/timingLog';
import { reminderTime } from '../../src/reminder/reminder';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';

/** Settings (FR-07, FR-22): every setting in one place, with safety, privacy, and About. */
export default function Settings() {
  const { preferences, update } = usePreferences();
  const [saved, setSaved] = useState(0);
  useFocusEffect(useCallback(() => setSaved(stores().rhythms.count()), []));
  const cues = [
    MODE_LABEL[preferences.cueMode],
    preferences.cueMode === 'tones' ? TONE_SET_LABEL[preferences.toneSet] : null,
    preferences.haptics ? `haptics ${preferences.hapticStrength}` : 'no haptics',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Settings
      </AppText>
      <RowGroup title="Guidance">
        <ListRow title="Cues & sound" subtitle={cues} onPress={() => router.push('/settings/sound')} />
      </RowGroup>
      <AppText variant="overline" accessibilityRole="header">
        MOTION
      </AppText>
      <AppText variant="label">A still guide is available. System follows your device’s Reduce Motion setting.</AppText>
      <Segmented
        label="Motion"
        value={preferences.motion}
        onChange={(motion) => update({ motion })}
        options={[
          { value: 'system', label: 'System' },
          { value: 'reduced', label: 'Reduced' },
        ]}
      />
      <AppText variant="overline" accessibilityRole="header">
        NIGHT PRACTICE
      </AppText>
      <AppText variant="label">A true-black screen, a dimmer guide, and a soft finish for practice at bedtime.</AppText>
      <Segmented
        label="Night practice"
        value={preferences.nightPractice}
        onChange={(nightPractice) => update({ nightPractice })}
        options={[
          { value: 'off', label: 'Off' },
          { value: 'evening', label: '9 PM–6 AM', accessibilityLabel: '9 PM to 6 AM' },
          { value: 'always', label: 'Always' },
        ]}
      />
      <RowGroup title="Practice">
        <ListRow
          title="Daily reminder"
          subtitle={preferences.reminder.enabled ? reminderTime(preferences.reminder) : 'Off'}
          onPress={() => router.push('/settings/reminder')}
        />
        <ListRow title="My rhythms" subtitle={`${saved} saved`} onPress={() => router.push('/rhythms')} />
      </RowGroup>
      <RowGroup title="Your data">
        <ListRow title="Export or import" subtitle="Included in device backups" onPress={() => router.push('/settings/data')} />
        <ListRow title="Privacy" onPress={() => router.push('/settings/privacy')} />
        <ListRow title="Safety & wellbeing" onPress={() => router.push('/settings/safety')} />
        <ListRow title="Delete local history" danger onPress={() => router.push({ pathname: '/settings/data', params: { delete: '1' } })} />
      </RowGroup>
      <RowGroup title="About">
        <ListRow title="About Viram" subtitle="Free promise, sources, voice" onPress={() => router.push('/settings/about')} />
      </RowGroup>
      {TIMING_LOG_ENABLED ? (
        <RowGroup title="Developer">
          <ListRow title="Cue timing" subtitle="How close each cue landed to its planned time" onPress={() => router.push('/settings/timing')} />
        </RowGroup>
      ) : null}
    </Screen>
  );
}
