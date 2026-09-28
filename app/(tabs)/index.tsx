import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '../../src/components/AppText';
import { BrandMark } from '../../src/components/BrandMark';
import { Button, ButtonRow } from '../../src/components/Button';
import { CueControls, MODE_LABEL } from '../../src/components/CueControls';
import { RhythmCard } from '../../src/components/RhythmCard';
import { Screen } from '../../src/components/Screen';
import { Sheet } from '../../src/components/Sheet';
import { practiceHref } from '../../src/practice/launch';
import { subtitleOf, techniqueOf } from '../../src/practice/practice';
import { readyPractice } from '../../src/practice/ready';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors, radius, spacing, touchTarget } from '../../src/theme';

/** Breathe (FR-01): the ready practice and one action to begin it. */
export default function Breathe() {
  const { preferences, update } = usePreferences();
  const [cuesOpen, setCuesOpen] = useState(false);
  const practice = readyPractice(preferences, stores());
  const technique = techniqueOf(practice);
  const guidance = [MODE_LABEL[preferences.cueMode], preferences.haptics ? 'Haptics' : null].filter(Boolean).join(' · ');

  const begin = () => {
    update({ lastPractice: practice });
    router.push(practiceHref(practice));
  };

  return (
    <Screen footer={<Button title="Begin" onPress={begin} accessibilityHint={`Starts ${practice.name}`} />}>
      <View style={styles.brand}>
        <BrandMark size={32} />
        <View>
          <AppText variant="bodyStrong" style={styles.wordmark}>
            Viram
          </AppText>
          <AppText variant="label">Ready when you are</AppText>
        </View>
      </View>
      <AppText variant="hero" accessibilityRole="header">
        A little space{'\n'}to breathe.
      </AppText>
      <RhythmCard
        name={practice.name}
        subtitle={subtitleOf(practice)}
        steps={practice.steps}
        target={practice.target}
        slowing={practice.slowing}
        nameHint={technique?.pronunciation?.respelling}
      />
      <ButtonRow>
        <Button title="Change practice" variant="secondary" style={styles.flex} onPress={() => router.navigate('/practices')} />
        <Button title="Adjust" variant="secondary" style={styles.flex} onPress={() => router.push('/adjust')} />
      </ButtonRow>
      <Pressable
        onPress={() => setCuesOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Guidance: ${guidance}`}
        accessibilityHint="Change voice, tones, haptics, and motion"
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      >
        <AppText variant="control" style={styles.chipText}>
          Guidance: {guidance}
        </AppText>
        <AppText variant="control" style={styles.chipText} importantForAccessibility="no">
          ›
        </AppText>
      </Pressable>
      <Sheet visible={cuesOpen} title="Guidance" onClose={() => setCuesOpen(false)}>
        <CueControls />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  wordmark: { color: colors.pine },
  flex: { flexGrow: 1, flexBasis: 140 },
  chip: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipPressed: { opacity: 0.8 },
  chipText: { color: colors.pine, flexShrink: 1 },
});
