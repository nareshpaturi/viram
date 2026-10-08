import { Platform, StyleSheet, View } from 'react-native';
import { playOnce } from '../audio/guide';
import { voiceSound } from '../audio/voices';
import type { CueMode } from '../breathing/timeline';
import { usePreferences } from '../settings/PreferencesProvider';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Segmented } from './Segmented';
import { SwitchRow } from './SwitchRow';
import { VolumeStepper } from './VolumeStepper';

const MODE_HELP: Record<CueMode, string> = {
  voice: 'Voice says each step, like “Inhale left.” With Voice or Tones, guidance continues when you lock your phone.',
  tones: 'A different sound marks each step. Guidance continues when you lock your phone.',
  silent:
    Platform.OS === 'ios'
      ? 'No sound. The screen stays on during practice. iPhone can’t tap while it’s locked, so choose what happens if you lock it.'
      : 'No sound. The screen stays on during practice. With haptics on, guidance continues when you lock your phone.',
};

export const MODE_LABEL: Record<CueMode, string> = { voice: 'Voice', tones: 'Tones', silent: 'Silent' };

/** Cue mode, volume, haptics, and motion: the cue chip sheet and Settings share these. */
export function CueControls() {
  const { preferences, update } = usePreferences();

  const sample = () => {
    const sound = preferences.cueMode === 'voice' ? voiceSound(preferences.voice, 'inhale') : `tone.${preferences.toneSet}.inhale`;
    if (preferences.cueMode !== 'silent') void playOnce(sound, preferences.cueVolume);
  };

  return (
    <View style={styles.stack}>
      <AppText variant="overline" accessibilityRole="header">
        CUES
      </AppText>
      <Segmented
        label="Cues"
        value={preferences.cueMode}
        onChange={(cueMode) => update({ cueMode })}
        options={(['voice', 'tones', 'silent'] as const).map((value) => ({ value, label: MODE_LABEL[value] }))}
      />
      <AppText variant="label">{MODE_HELP[preferences.cueMode]}</AppText>
      {Platform.OS === 'ios' && preferences.cueMode === 'silent' ? (
        <Segmented
          label="When the screen locks"
          value={preferences.silentLocked}
          onChange={(silentLocked) => update({ silentLocked })}
          options={[
            { value: 'pause', label: 'Pause', accessibilityLabel: 'When the screen locks, pause' },
            { value: 'tones', label: 'Soft tones', accessibilityLabel: 'When the screen locks, continue with soft tones' },
          ]}
        />
      ) : null}
      {preferences.cueMode !== 'silent' ? (
        <VolumeStepper label="Cue volume" value={preferences.cueVolume} onChange={(cueVolume) => update({ cueVolume })} />
      ) : null}
      <SwitchRow label="Haptics" description="A different feel for each step" value={preferences.haptics} onChange={(haptics) => update({ haptics })} />
      <AppText variant="overline" accessibilityRole="header" style={styles.section}>
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
      {preferences.cueMode !== 'silent' ? <Button title="Hear a sample" variant="secondary" onPress={sample} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.ms },
  section: { marginTop: spacing.sm, color: colors.inkSoft },
});
