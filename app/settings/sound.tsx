import { StyleSheet } from 'react-native';
import { playOnce } from '../../src/audio/guide';
import { MUSIC_CHOICES, MUSIC_LABEL, MUSIC_PREVIEW_MS, musicSound } from '../../src/audio/music';
import { TONE_SETS, TONE_SET_LABEL } from '../../src/audio/toneSets';
import { VOICES, VOICE_IDS, VOICE_PREVIEW_MS, voiceSound } from '../../src/audio/voices';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { CueControls } from '../../src/components/CueControls';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { SwitchRow } from '../../src/components/SwitchRow';
import { VolumeStepper } from '../../src/components/VolumeStepper';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { colors, spacing } from '../../src/theme';

/** Cues & sound (FR-03 sound controls). Every choice persists and applies from the next practice. */
export default function CuesAndSound() {
  const { preferences, update } = usePreferences();

  return (
    <Screen edges={['left', 'right']}>
      <CueControls />

      <Section title="VOICE" help="Speaks every cue, count, name, and introduction. Choosing one plays a short sample.">
        <Segmented
          label="Voice"
          wrap
          value={preferences.voice}
          onChange={(voice) => {
            update({ voice });
            void playOnce(voiceSound(voice, 'intro.sama-vritti'), preferences.cueVolume, VOICE_PREVIEW_MS);
          }}
          options={VOICE_IDS.map((value) => ({ value, label: VOICES[value].label, accessibilityLabel: VOICES[value].spoken }))}
        />
      </Section>

      <Section title="MUSIC" help="Plays softly under Voice and Tones, in tune with the tones. Silent stays silent, and with Play along it stays quiet while your own music plays.">
        <Segmented
          label="Music"
          value={preferences.music}
          onChange={(music) => {
            update({ music });
            if (music !== 'off') void playOnce(musicSound(music), preferences.musicVolume, MUSIC_PREVIEW_MS);
          }}
          options={MUSIC_CHOICES.map((value) => ({ value, label: MUSIC_LABEL[value] }))}
        />
        {preferences.music !== 'off' ? (
          <VolumeStepper label="Music volume" value={preferences.musicVolume} onChange={(musicVolume) => update({ musicVolume })} />
        ) : null}
      </Section>

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

      <Section title="OTHER AUDIO" help="Music and podcasts. Play along keeps them playing under the cues. Pause it stops them while you practice and shows the practice on your lock screen.">
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
        <Segmented
          label="Introduction length"
          value={preferences.introLength}
          onChange={(introLength) => update({ introLength })}
          options={[
            { value: 'short', label: 'Short', accessibilityLabel: 'Short, about 30 seconds' },
            { value: 'long', label: 'Longer', accessibilityLabel: 'Longer, about a minute' },
          ]}
        />
        <Button
          title="Hear a sample"
          variant="secondary"
          onPress={() => void playOnce(voiceSound(preferences.voice, preferences.introLength === 'long' ? 'intro-long.sama-vritti' : 'intro.sama-vritti'), preferences.cueVolume)}
        />
      </Section>

      {preferences.cueMode === 'voice' ? (
        <SwitchRow
          label="Count within steps"
          description="“Two, three, four” after each step’s cue"
          value={preferences.voiceCounting}
          onChange={(voiceCounting) => update({ voiceCounting })}
        />
      ) : null}

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
