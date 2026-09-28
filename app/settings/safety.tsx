import { StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { COMFORT_LINE, GENERAL_TAKE_CARE, WELLNESS_LINE } from '../../src/content/safety';
import { spacing } from '../../src/theme';

/** Safety & wellbeing (FR-07): the comfort guidance and the durable wellness statement. */
export default function Safety() {
  return (
    <Screen edges={['left', 'right']}>
      <AppText variant="hero" accessibilityRole="header">
        Stay comfortable.
      </AppText>
      <AppText>{COMFORT_LINE}</AppText>
      <Card>
        {GENERAL_TAKE_CARE.map((line) => (
          <View key={line} style={styles.item}>
            <AppText importantForAccessibility="no">•</AppText>
            <AppText style={styles.text}>{line}</AppText>
          </View>
        ))}
      </Card>
      <AppText>Each practice also lists its own “Take care” notes.</AppText>
      <AppText variant="bodyStrong">{WELLNESS_LINE}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.sm },
  text: { flex: 1 },
});
