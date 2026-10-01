import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { playOnce } from '../../src/audio/guide';
import { PLACEHOLDER_VOICE } from '../../src/audio/manifest.generated';
import { describeTarget } from '../../src/breathing/describe';
import { AppText } from '../../src/components/AppText';
import { Button, ButtonRow } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icons';
import { RhythmCard } from '../../src/components/RhythmCard';
import { Screen } from '../../src/components/Screen';
import { TechniquePlate } from '../../src/components/TechniquePlate';
import { isStudy, sourceLine } from '../../src/content/sourceText';
import { practiceHref } from '../../src/practice/launch';
import { practiceFromTechnique } from '../../src/practice/practice';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { findTechnique } from '../../src/sharing/link';
import { colors, fonts, radius, spacing } from '../../src/theme';

/**
 * Technique guide (FR-09). Order: name, how it sounds, Take care, rhythm,
 * how to, tradition, research, sources. Take care sits before Begin and is
 * never collapsed. “Reviewed by” renders only from a recorded review.
 */
export default function TechniqueGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const technique = id ? findTechnique(id) : undefined;
  const { preferences, update } = usePreferences();
  const insets = useSafeAreaInsets();

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
    <View style={styles.fill}>
      <Screen edges={['left', 'right']} footer={<Button title={`Begin · ${describeTarget(technique.practice.target)}`} onPress={begin} />}>
        <TechniquePlate steps={practice.steps}>
          <AppText variant="overline">{technique.family === 'classical' ? 'CLASSICAL PRANAYAMA' : 'MODERN PATTERN'}</AppText>
          <View>
            <AppText variant="title" accessibilityRole="header" accessibilityHint={pronunciation?.respelling}>
              {technique.name}
            </AppText>
            <AppText>{technique.subtitle}</AppText>
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
              <AppText variant="bodyStrong" style={styles.respelling} accessibilityLabel={`Said ${pronunciation.respelling}`}>
                {pronunciation.respelling}
              </AppText>
              <AppText variant="label">
                {[pronunciation.devanagari, technique.aliases?.length ? `also ${technique.aliases.join(', ')}` : null].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          ) : null}
        </TechniquePlate>
        <View style={styles.tags} accessible accessibilityLabel={tags.join(', ')}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <AppText variant="label" style={styles.tagText}>
                {tag}
              </AppText>
            </View>
          ))}
        </View>
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
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={4}
        style={({ pressed }) => [styles.back, { top: insets.top + 8 }, pressed && styles.backPressed]}
      >
        <Icon name="back" color={colors.pine} size={18} strokeWidth={2} />
      </Pressable>
    </View>
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
  fill: { flex: 1 },
  say: { gap: 2, marginTop: spacing.sm, alignItems: 'flex-start' },
  respelling: { color: colors.pine },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { minHeight: 28, paddingHorizontal: spacing.ms, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, justifyContent: 'center' },
  tagText: { color: colors.pine, fontFamily: fonts.sansSemibold, fontSize: 12 },
  // Frosted and round; it stays put while the plate scrolls.
  back: {
    position: 'absolute',
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassRim,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: { opacity: 0.7 },
  flex: { flexGrow: 1, flexBasis: 140 },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.sm },
  number: { minWidth: 20, color: colors.inkSoft },
  itemText: { flex: 1 },
});
