import { StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { WATCH_NAME, useWatchState } from '../../src/companion/watchState';
import { phasesLine } from '../../src/haptics/patterns';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { spacing } from '../../src/theme';

const HOW = [
  'Your watch shows Breathe’s practice first, then 5-minute box breathing, My rhythms, and the library.',
  'Tap one to begin. After three seconds to settle, the watch taps out each step: you can practise with your eyes closed and your phone put away.',
  'It keeps going with your wrist down. Pause, resume, or end early on the watch.',
  'Each practice comes back to History on this phone, and to Health if you’ve connected it.',
];

/** What Viram does on the watch, and whether it's there (research gap 4). */
export default function Watch() {
  const state = useWatchState();
  const { preferences } = usePreferences();
  return (
    <Screen edges={['left', 'right']}>
      <AppText variant="heading" accessibilityRole="header">
        {state === 'installed' ? `Viram is on your ${WATCH_NAME}.` : `Viram for ${WATCH_NAME}`}
      </AppText>
      {state === 'paired' ? <AppText>Install Viram on your watch from its app store to practise from your wrist.</AppText> : null}
      <Card>
        {HOW.map((line) => (
          <View key={line} style={styles.item}>
            <AppText importantForAccessibility="no">•</AppText>
            <AppText style={styles.text}>{line}</AppText>
          </View>
        ))}
      </Card>
      <AppText variant="label">
        Haptics on the watch follow Cues & sound: {preferences.hapticStyle === 'through' ? 'through the breath' : 'marks'}, on{' '}
        {phasesLine(preferences.hapticPhases).toLowerCase()}.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.sm },
  text: { flex: 1 },
});
