import { Platform, StyleSheet, View } from 'react-native';
import { usePreview } from '../audio/usePreview';
import { voiceSound } from '../audio/voices';
import type { CueMode } from '../breathing/timeline';
import { lockBehavior, MODE_HELP } from '../practice/guidanceRules';
import { VISUAL_GUIDE_NAME, visualGuideOf } from '../practice/visualGuide';
import { usePreferences } from '../settings/PreferencesProvider';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Segmented } from './Segmented';
import { SwitchRow } from './SwitchRow';
import { VisualGuideRow } from './VisualGuideRow';
import { VolumeStepper } from './VolumeStepper';

export const MODE_LABEL: Record<CueMode, string> = { voice: 'Voice', tones: 'Tones', silent: 'Silent' };

/**
 * Cue mode, volume, haptics, visual guide, and motion: the Guidance sheet
 * and Settings share these. The Visual guide row opens its own screen.
 */
export function CueControls({ onVisualGuide }: { onVisualGuide?: () => void }) {
  const { preferences, update } = usePreferences();

  const { playing, toggle } = usePreview();
  const sample = () => {
    const sound = preferences.cueMode === 'voice' ? voiceSound(preferences.voice, 'inhale') : `tone.${preferences.toneSet}.inhale`;
    if (preferences.cueMode !== 'silent') toggle('cue', sound, preferences.cueVolume);
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
      <AppText variant="label">
        {MODE_HELP[lockBehavior({ mode: preferences.cueMode, haptics: preferences.haptics, silentLocked: preferences.silentLocked, platform: Platform.OS })]}
      </AppText>
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
      {onVisualGuide ? <VisualGuideRow value={VISUAL_GUIDE_NAME[visualGuideOf(preferences.visualGuide)]} onPress={onVisualGuide} /> : null}
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
      {preferences.cueMode !== 'silent' ? <Button title={playing === 'cue' ? 'Stop sample' : 'Hear a sample'} variant="secondary" onPress={sample} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.ms },
  section: { marginTop: spacing.sm, color: colors.inkSoft },
});
