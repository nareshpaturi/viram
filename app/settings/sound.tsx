import { StyleSheet } from 'react-native';
import { playOnce } from '../../src/audio/guide';
import { TONE_SETS, TONE_SET_LABEL } from '../../src/audio/toneSets';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { CueControls } from '../../src/components/CueControls';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { SwitchRow } from '../../src/components/SwitchRow';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { colors, spacing } from '../../src/theme';

/** Cues & sound (FR-03 sound controls). Every choice persists and applies from the next practice. */
export default function CuesAndSound() {
  const { preferences, update } = usePreferences();

  return (
    <Screen edges={['left', 'right']}>
      <CueControls />

      <Section title="TONE SET" help="A different sound for each step.">
        <Segmented
          label="Tone set"
          value={preferences.toneSet}
          onChange={(toneSet) => {
            update({ toneSet });
            void playOnce(`tone.${toneSet}.inhale`, preferences.cueVolume);
          }}
          options={TONE_SETS.map((value) => ({ value, label: TONE_SET_LABEL[value] }))}
        />
      </Section>

      <Section title="OTHER AUDIO" help="Music and podcasts. Play along keeps them going and lowers them briefly for each cue.">
        <Segmented
          label="Other audio"
          value={preferences.otherAudio}
          onChange={(otherAudio) => update({ otherAudio })}
          options={[
            { value: 'alongside', label: 'Play along' },
            { value: 'pause', label: 'Pause it' },
          ]}
        />
      </Section>

      {preferences.haptics ? (
        <Section title="HAPTIC STRENGTH">
          <Segmented
            label="Haptic strength"
            value={preferences.hapticStrength}
            onChange={(hapticStrength) => update({ hapticStrength })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'medium', label: 'Medium' },
              { value: 'strong', label: 'Strong' },
            ]}
          />
        </Section>
      ) : null}

      <SwitchRow
        label="Keep screen on"
        description="During practice. Always on in Silent."
        value={preferences.keepScreenOn}
        onChange={(keepScreenOn) => update({ keepScreenOn })}
      />

      <Section title="SPOKEN INTRODUCTIONS" help="A short introduction, with captions, before a practice. You can always skip it.">
        <Segmented
          label="Spoken introductions"
          value={preferences.introductions}
          onChange={(introductions) => update({ introductions })}
          options={[
            { value: 'first', label: 'First time' },
            { value: 'always', label: 'Always' },
            { value: 'never', label: 'Never' },
          ]}
        />
        <Button title="Hear a sample" variant="secondary" onPress={() => void playOnce('voice.intro.sama-vritti', preferences.cueVolume)} />
      </Section>

      <AppText variant="label">
        When a step is too short for its spoken cue, Viram plays a tone instead. Voice guidance is AI-generated from scripts written for Viram.
      </AppText>
    </Screen>
  );
}

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <>
      <AppText variant="overline" accessibilityRole="header" style={styles.section}>
        {title}
      </AppText>
      {help ? <AppText variant="label">{help}</AppText> : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.sm, color: colors.inkSoft },
});
