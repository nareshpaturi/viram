import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { playOnce } from '../../src/audio/guide';
import { PLACEHOLDER_VOICE } from '../../src/audio/manifest.generated';
import { describeTarget } from '../../src/breathing/describe';
import { AppText } from '../../src/components/AppText';
import { Button, ButtonRow } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { RhythmCard } from '../../src/components/RhythmCard';
import { Screen } from '../../src/components/Screen';
import { isStudy, sourceLine } from '../../src/content/sourceText';
import { practiceHref } from '../../src/practice/launch';
import { practiceFromTechnique } from '../../src/practice/practice';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { findTechnique } from '../../src/sharing/link';
import { colors, spacing } from '../../src/theme';

/**
 * Technique guide (FR-09). Order: name, how it sounds, Take care, rhythm,
 * how to, tradition, research, sources. Take care sits before Begin and is
 * never collapsed. “Reviewed by” renders only from a recorded review.
 */
export default function TechniqueGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const technique = id ? findTechnique(id) : undefined;
  const { preferences, update } = usePreferences();

  if (!technique) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">This practice isn’t in your library.</AppText>
        <Button title="Go to Practices" variant="secondary" onPress={() => router.navigate('/practices')} />
      </Screen>
    );
  }

  const practice = practiceFromTechnique(technique);
  const { guidance, pronunciation, review } = technique;
  const holds = technique.practice.steps.some((s) => (s.kind === 'hold' || s.kind === 'rest') && s.seconds > 0);
  const tags = ['Gentle', technique.practice.posture === 'seated' ? 'Seated' : 'Seated or lying', holds ? null : 'No breath holds'].filter(Boolean);
  const books = guidance.basedOn.filter((s) => !isStudy(s));
  const studies = guidance.basedOn.filter(isStudy);
  const reviewed = review && review.contentVersion === technique.contentVersion ? review : null;
  // “Hear it” appears once approved clips replace the placeholders (D23).
  const canHear = pronunciation && !PLACEHOLDER_VOICE;

  const begin = () => {
    update({ lastPractice: practice });
    router.push(practiceHref(practice));
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={<Button title={`Begin · ${describeTarget(technique.practice.target)}`} onPress={begin} />}
    >
      <AppText variant="overline">{technique.family === 'classical' ? 'CLASSICAL PRANAYAMA' : 'MODERN PATTERN'}</AppText>
      <View>
        <AppText variant="title" accessibilityRole="header" accessibilityHint={pronunciation?.respelling}>
          {technique.name}
        </AppText>
        <AppText style={styles.muted}>{technique.subtitle}</AppText>
      </View>
      {pronunciation ? (
        <View style={styles.say}>
          {canHear ? (
            <Button
              title="▶ Hear it"
              variant="secondary"
              accessibilityLabel={`Hear how to say ${technique.name}`}
              onPress={() => void playOnce(`voice.${pronunciation.clip}`, preferences.cueVolume)}
            />
          ) : null}
          <AppText variant="bodyStrong" accessibilityLabel={`Said ${pronunciation.respelling}`}>
            {pronunciation.respelling}
          </AppText>
          <AppText variant="label">{pronunciation.devanagari}</AppText>
        </View>
      ) : null}
      <AppText variant="label">{tags.join(' · ')}</AppText>
      <Card muted>
        <AppText>
          <AppText variant="bodyStrong">Take care: </AppText>
          {guidance.takeCareShort}
        </AppText>
      </Card>
      <RhythmCard name={technique.name} subtitle={technique.subtitle} steps={practice.steps} target={practice.target} />
      <ButtonRow>
        <Button
          title="Adjust rhythm"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/adjust', params: { technique: technique.id } })}
        />
        <Button
          title="Share"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/share', params: { practice: JSON.stringify(practice) } })}
        />
      </ButtonRow>
      <AppText>{guidance.lead}</AppText>

      <Section title="How to">
        {guidance.howTo.map((line, i) => (
          <View key={i} style={styles.item}>
            <AppText variant="bodyStrong" style={styles.number}>
              {i + 1}.
            </AppText>
            <AppText style={styles.itemText}>{line}</AppText>
          </View>
        ))}
      </Section>
      <Section title={technique.family === 'classical' ? 'Traditionally' : 'Where it comes from'}>
        <AppText>{guidance.context}</AppText>
      </Section>
      <Section title="Take care">
        {guidance.takeCare.map((line, i) => (
          <Bullet key={i} text={line} />
        ))}
      </Section>
      <Section title="What research says">
        <AppText>{guidance.research}</AppText>
      </Section>
      <Section title="Based on">
        {books.map((s) => (
          <Bullet key={s} text={sourceLine(s)} />
        ))}
        {studies.length > 0 ? (
          <AppText variant="label">
            {studies.length} published {studies.length === 1 ? 'study' : 'studies'}, listed in Settings › About › Sources
          </AppText>
        ) : null}
      </Section>
      {reviewed ? (
        <AppText variant="label">
          Reviewed by {reviewed.reviewer}, {reviewed.credential}
        </AppText>
      ) : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.item}>
      <AppText style={styles.number} importantForAccessibility="no">
        •
      </AppText>
      <AppText style={styles.itemText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  say: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.ms },
  flex: { flexGrow: 1, flexBasis: 140 },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.sm },
  number: { minWidth: 20, color: colors.inkSoft },
  itemText: { flex: 1 },
});
