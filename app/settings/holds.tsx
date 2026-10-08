import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Button, ButtonRow } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { SwitchRow } from '../../src/components/SwitchRow';
import { LONG_HOLDS } from '../../src/content/longHolds';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { colors, spacing } from '../../src/theme';

/**
 * Longer holds (src/content/longHolds.ts): read the care notes, then turn
 * on. Turning off keeps saved rhythms as they are; Adjust then only lets
 * a long hold come down.
 */
export default function LongHolds() {
  const { preferences, update } = usePreferences();
  const [confirming, setConfirming] = useState(false);

  const toggle = (on: boolean) => {
    if (on) return setConfirming(true);
    update({ longHolds: false });
    AccessibilityInfo.announceForAccessibility('Longer holds off');
  };
  const turnOn = () => {
    update({ longHolds: true });
    setConfirming(false);
    AccessibilityInfo.announceForAccessibility('Longer holds on. Holds can run up to 60 seconds.');
  };

  return (
    <Screen edges={['left', 'right']}>
      <AppText>{LONG_HOLDS.lead}</AppText>
      <AppText>{LONG_HOLDS.what}</AppText>
      <Card>
        <AppText variant="overline" accessibilityRole="header">
          TAKE CARE
        </AppText>
        {LONG_HOLDS.takeCare.map((line) => (
          <View key={line} style={styles.item}>
            <AppText importantForAccessibility="no">•</AppText>
            <AppText style={styles.text}>{line}</AppText>
          </View>
        ))}
      </Card>
      {confirming ? (
        <Card>
          <AppText variant="bodyStrong" accessibilityRole="alert">
            Turn on longer holds?
          </AppText>
          <AppText>Only if the notes above are fine for you. You can turn this off at any time.</AppText>
          <ButtonRow>
            <Button title="Turn on" style={styles.flex} onPress={turnOn} />
            <Button title="Not now" variant="secondary" style={styles.flex} onPress={() => setConfirming(false)} />
          </ButtonRow>
        </Card>
      ) : (
        <SwitchRow label="Longer holds" description="Holds and rests up to 60 seconds" value={preferences.longHolds} onChange={toggle} />
      )}
      <AppText variant="label">{LONG_HOLDS.sharing}</AppText>
      {LONG_HOLDS.review ? null : (
        <AppText variant="label" style={styles.dev}>
          Development build only: this appears in release builds after a named instructor reviews it.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.sm },
  text: { flex: 1 },
  flex: { flexGrow: 1, flexBasis: 140 },
  dev: { color: colors.coralDeep },
});
