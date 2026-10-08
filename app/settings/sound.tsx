import { Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MUSIC_CHOICES, MUSIC_LABEL, MUSIC_PREVIEW_MS, musicSound } from '../../src/audio/music';
import { TONE_SETS, TONE_SET_LABEL } from '../../src/audio/toneSets';
import { usePreview } from '../../src/audio/usePreview';
import { VOICES, VOICE_IDS, VOICE_PREVIEW_MS, voiceLanguage, voiceSound } from '../../src/audio/voices';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { CueControls } from '../../src/components/CueControls';
import { PlayButton } from '../../src/components/PlayButton';
import { RadioCard, RadioRow } from '../../src/components/RadioCard';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { SwitchRow } from '../../src/components/SwitchRow';
import { ToggleChips } from '../../src/components/ToggleChips';
import { VolumeStepper } from '../../src/components/VolumeStepper';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { colors, spacing } from '../../src/theme';

/** Cues & sound (FR-03 sound controls). Every choice persists and applies from the next practice. */
export default function CuesAndSound() {
  const { preferences, update } = usePreferences();
  // Choosing never plays; each row has its own sample (UX10).
  const { playing, toggle } = usePreview();
  const status = (key: string) => (playing === key ? 'Playing sample' : null);
  const introSample = voiceSound(preferences.voice, preferences.introLength === 'long' ? 'intro-long.sama-vritti' : 'intro.sama-vritti');

  return (
    <Screen edges={['left', 'right']}>
      <CueControls onVisualGuide={() => router.push({ pathname: '/visual-guide', params: { origin: 'settings' } })} />

      <Section title="VOICE" help="Speaks every cue, count, name, and introduction. Tap play to hear a voice before you choose it.">
        <RadioCard label="Voice">
          {VOICE_IDS.map((voice, i) => (
            <RadioRow
              key={voice}
              ring="leading"
              label={VOICES[voice].label}
              detail={status(`voice:${voice}`)}
              accessibilityLabel={VOICES[voice].spoken}
              selected={preferences.voice === voice}
              onPress={() => update({ voice })}
              last={i === VOICE_IDS.length - 1}
              accessory={
                <PlayButton
                  label={VOICES[voice].spoken}
                  playing={playing === `voice:${voice}`}
                  onMist={preferences.voice === voice}
                  onPress={() => toggle(`voice:${voice}`, voiceSound(voice, 'intro.sama-vritti'), preferences.cueVolume, VOICE_PREVIEW_MS)}
                />
              }
            />
          ))}
        </RadioCard>
        {voiceLanguage(preferences.voice) === 'hi' ? (
          <AppText variant="label">Cues, counts, and introductions are spoken in Hindi, with Hindi captions. The screens stay in English.</AppText>
        ) : null}
      </Section>

      <Section title="MUSIC" help="Plays softly under Voice and Tones, in tune with the tones. Silent stays silent, and it stays quiet whenever Viram is playing along with your own music.">
        <RadioCard label="Music">
          {MUSIC_CHOICES.map((music, i) => (
            <RadioRow
              key={music}
              ring="leading"
              label={MUSIC_LABEL[music]}
              detail={status(`music:${music}`)}
              selected={preferences.music === music}
              onPress={() => update({ music })}
              last={i === MUSIC_CHOICES.length - 1}
              accessory={
                music === 'off' ? null : (
                  <PlayButton
                    label={MUSIC_LABEL[music]}
                    playing={playing === `music:${music}`}
                    onMist={preferences.music === music}
                    onPress={() => toggle(`music:${music}`, musicSound(music), preferences.musicVolume, MUSIC_PREVIEW_MS)}
                  />
                )
              }
            />
          ))}
        </RadioCard>
        {preferences.music !== 'off' ? (
          <VolumeStepper label="Music volume" value={preferences.musicVolume} onChange={(musicVolume) => update({ musicVolume })} />
        ) : null}
      </Section>

      <Section title="TONE SET" help="A different sound for each step.">
        <RadioCard label="Tone set">
          {TONE_SETS.map((toneSet, i) => (
            <RadioRow
              key={toneSet}
              ring="leading"
              label={TONE_SET_LABEL[toneSet]}
              detail={status(`tones:${toneSet}`)}
              selected={preferences.toneSet === toneSet}
              onPress={() => update({ toneSet })}
              last={i === TONE_SETS.length - 1}
              accessory={
                <PlayButton
                  label={TONE_SET_LABEL[toneSet]}
                  playing={playing === `tones:${toneSet}`}
                  onMist={preferences.toneSet === toneSet}
                  onPress={() => toggle(`tones:${toneSet}`, `tone.${toneSet}.inhale`, preferences.cueVolume)}
                />
              }
            />
          ))}
        </RadioCard>
      </Section>

      <Section title="OTHER AUDIO" help={OTHER_AUDIO_HELP}>
        <Segmented
          label="Other audio"
          wrap
          value={preferences.otherAudio}
          onChange={(otherAudio) => update({ otherAudio })}
          options={OTHER_AUDIO_OPTIONS}
        />
      </Section>

      {preferences.haptics ? (
        <Section title="HAPTICS" help="Each step feels different, and the exhale is the longest. Viram on your watch follows these too.">
          <Segmented
            label="Haptic style"
            value={preferences.hapticStyle}
            onChange={(hapticStyle) => update({ hapticStyle })}
            options={[
              { value: 'marks', label: 'Marks', accessibilityLabel: 'Marks: a tap or buzz as each step begins' },
              { value: 'through', label: 'Through the breath', accessibilityLabel: 'Through the breath: taps all through the inhale and the exhale' },
            ]}
          />
          <AppText variant="label">
            {preferences.hapticStyle === 'through'
              ? 'Quick taps grow through the inhale; slow taps fade through the exhale.'
              : 'A rising double tap to breathe in, a light tap to hold, a long soft buzz to breathe out.'}
          </AppText>
          <AppText variant="label">On these steps</AppText>
          <ToggleChips
            label="Haptics on"
            options={[
              { key: 'inhale', label: 'Inhale' },
              { key: 'hold', label: 'Hold' },
              { key: 'exhale', label: 'Exhale' },
              { key: 'rest', label: 'Rest' },
            ]}
            value={preferences.hapticPhases}
            onChange={(hapticPhases) => update({ hapticPhases })}
          />
          <AppText variant="label">Strength</AppText>
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
          title={playing === 'intro' ? 'Stop sample' : 'Hear a sample'}
          variant="secondary"
          onPress={() => toggle('intro', introSample, preferences.cueVolume)}
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

const OTHER_AUDIO_OPTIONS =
  Platform.OS === 'ios'
    ? [
        { value: 'auto' as const, label: 'Automatic' },
        { value: 'alongside' as const, label: 'Play along' },
        { value: 'pause' as const, label: 'Pause it' },
      ]
    : [
        { value: 'alongside' as const, label: 'Play along' },
        { value: 'lower' as const, label: 'Lower it', accessibilityLabel: 'Lower it under each cue' },
        { value: 'pause' as const, label: 'Pause it' },
      ];

const OTHER_AUDIO_HELP =
  Platform.OS === 'ios'
    ? 'Music and podcasts. Automatic keeps them playing if they’re on when you begin; otherwise Viram takes the audio, so your lock screen shows the practice. Play along never stops them. Pause it always does.'
    : 'Music and podcasts. Play along keeps them playing at their own volume. Lower it dips them briefly under each cue. Pause it stops them while you practise.';

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
