import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { playOnce } from '../../src/audio/guide';
import { PLACEHOLDER_VOICE } from '../../src/audio/manifest.generated';
import { voiceSound } from '../../src/audio/voices';
import { describeTarget } from '../../src/breathing/describe';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icons';
import { RowGroup } from '../../src/components/ListRow';
import { RhythmSummary } from '../../src/components/RhythmSummary';
import { Screen } from '../../src/components/Screen';
import { PLATE_TOP, TechniquePlate } from '../../src/components/TechniquePlate';
import { useReducedMotion } from '../../src/accessibility/motion';
import { isStudy, sourceLine } from '../../src/content/sourceText';
import { practiceHref } from '../../src/practice/launch';
import { practiceFromTechnique } from '../../src/practice/practice';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { findTechnique } from '../../src/sharing/link';
import { colors, fonts, radius, spacing } from '../../src/theme';
import Svg, { Path } from 'react-native-svg';

/**
 * Technique guide (FR-09, UX08). Order: name, how it sounds, tags (other
 * names among them), the lead, rhythm, Take care in full, how to, then
 * tradition, research, and sources, collapsed. Take care sits before Begin
 * and is never collapsed. “Reviewed by” renders only from a recorded review.
 */
export default function TechniqueGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const technique = id ? findTechnique(id) : undefined;
  const { preferences, update } = usePreferences();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion(preferences.motion);
  // The top bar fades in as the plate's name scrolls under it, so nothing
  // ever runs beneath the status bar. Its edges come from the name's layout:
  // the plate's text column starts at its top padding.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [nameBox, setNameBox] = useState({ y: 22, height: 34 });
  const [barShown, setBarShown] = useState(false);
  const barBottom = insets.top + BAR_HEIGHT;
  const nameTop = insets.top + PLATE_TOP + nameBox.y;
  const shownAt = Math.max(1, nameTop + nameBox.height - barBottom);
  const fadeFrom = reducedMotion ? shownAt - 1 : Math.min(shownAt - 1, Math.max(0, nameTop - barBottom));
  const bar = scrollY.interpolate({ inputRange: [fadeFrom, shownAt], outputRange: [0, 1], extrapolate: 'clamp' });
  // Paper first, then the name, so the name never lands on half-clear paper over the overline.
  const paper = bar.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });
  const title = bar.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => setBarShown(value >= shownAt));
    return () => scrollY.removeListener(listener);
  }, [scrollY, shownAt]);

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
  const tags = [
    'Gentle',
    technique.practice.posture === 'seated' ? 'Seated' : 'Seated or lying',
    holds ? null : 'No breath holds',
    ...(technique.aliases ?? []).map((alias) => `Also ${alias}`),
  ].filter((tag): tag is string => !!tag);
  const books = guidance.basedOn.filter((s) => !isStudy(s));
  const studies = guidance.basedOn.filter(isStudy);
  const reviewed = review && review.contentVersion === technique.contentVersion ? review : null;
  // “Hear it” appears once approved clips replace the placeholders (D23).
  const canHear = pronunciation && !PLACEHOLDER_VOICE;

  const begin = () => {
    update({ lastPractice: practice });
    router.push(practiceHref(practice));
  };

  const sources = guidance.basedOn.length;
  return (
    <View style={styles.fill}>
      <Screen
        edges={['left', 'right']}
        footer={<Button title={`Begin · ${describeTarget(technique.practice.target)}`} onPress={begin} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        <TechniquePlate steps={practice.steps}>
          <AppText variant="overline">{technique.family === 'classical' ? 'CLASSICAL PRANAYAMA' : 'MODERN PATTERN'}</AppText>
          <AppText
            variant="title"
            accessibilityRole="header"
            accessibilityHint={pronunciation?.respelling}
            style={styles.name}
            onLayout={(e) => setNameBox({ y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height })}
          >
            {technique.name}
          </AppText>
          <AppText style={styles.plateLine}>{technique.subtitle}</AppText>
          {pronunciation ? (
            // Two lines at every width: the respelling, then the Devanagari.
            <View accessible accessibilityLabel={`Said ${pronunciation.respelling}`}>
              <AppText style={[styles.plateLine, styles.respelling, styles.strong]}>{pronunciation.respelling}</AppText>
              <AppText variant="label">{pronunciation.devanagari}</AppText>
            </View>
          ) : null}
          {canHear ? (
            <Button
              title="▶ Hear it"
              variant="secondary"
              style={styles.hear}
              accessibilityLabel={`Hear how to say ${technique.name}`}
              onPress={() => void playOnce(voiceSound(preferences.voice, pronunciation.clip), preferences.cueVolume)}
            />
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
        <AppText>{guidance.lead}</AppText>
        <RhythmSummary steps={practice.steps} target={practice.target} />
        <View style={styles.pills}>
          <Button
            title="Adjust rhythm"
            variant="secondary"
            style={styles.pill}
            onPress={() => router.push({ pathname: '/adjust', params: { technique: technique.id } })}
          />
          <Button
            title="Share"
            variant="secondary"
            style={styles.pill}
            onPress={() => router.push({ pathname: '/share', params: { practice: JSON.stringify(practice) } })}
          />
        </View>
        {/* Take care in full, before How to and Begin; never collapsed (FR-09). */}
        <Card muted style={styles.care}>
          <AppText variant="heading" accessibilityRole="header">
            Take care
          </AppText>
          {guidance.takeCare.map((line, i) => (
            <Bullet key={i} text={line} />
          ))}
        </Card>
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            How to
          </AppText>
          {guidance.howTo.map((line, i) => (
            <View key={i} style={styles.item}>
              <AppText style={styles.number}>{i + 1}.</AppText>
              <AppText style={styles.itemText}>{line}</AppText>
            </View>
          ))}
        </View>
        <RowGroup tone="white">
          <Disclosure title={technique.family === 'classical' ? 'Traditionally' : 'Where it comes from'}>
            <AppText>{guidance.context}</AppText>
          </Disclosure>
          <Disclosure title="What research says">
            <AppText>{guidance.research}</AppText>
          </Disclosure>
          <Disclosure title="Based on" count={`${sources} ${sources === 1 ? 'source' : 'sources'}`} last>
            {books.map((s) => (
              <Bullet key={s} text={sourceLine(s)} />
            ))}
            {studies.length > 0 ? (
              <AppText variant="label">
                {studies.length} published {studies.length === 1 ? 'study' : 'studies'}, listed in Settings › About › Sources
              </AppText>
            ) : null}
          </Disclosure>
        </RowGroup>
        {reviewed ? (
          <AppText variant="label">
            Reviewed by {reviewed.reviewer}, {reviewed.credential}
          </AppText>
        ) : null}
      </Screen>
      {/* Paper over the status bar once the name has scrolled away; the name moves up into it. */}
      <Animated.View
        pointerEvents={barShown ? 'auto' : 'none'}
        style={[
          styles.bar,
          {
            height: barBottom,
            paddingTop: insets.top,
            backgroundColor: paper.interpolate({ inputRange: [0, 1], outputRange: ['rgba(251, 252, 248, 0)', 'rgba(251, 252, 248, 0.96)'] }),
            borderBottomColor: paper.interpolate({ inputRange: [0, 1], outputRange: ['rgba(18, 55, 47, 0)', 'rgba(18, 55, 47, 0.08)'] }),
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={{ opacity: title }}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.barTitle}>
            {technique.name}
          </AppText>
        </Animated.View>
      </Animated.View>
      {/* Frosted over the plate, mist on the bar's paper. */}
      <Animated.View
        style={[
          styles.back,
          {
            top: insets.top + (BAR_HEIGHT - 44) / 2,
            backgroundColor: paper.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255, 255, 255, 0.6)', colors.mist] }),
            borderColor: paper.interpolate({ inputRange: [0, 1], outputRange: [colors.glassRim, colors.mist] }),
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={4}
          style={({ pressed }) => [styles.backPress, pressed && styles.backPressed]}
        >
          <Icon name="back" color={colors.pine} size={18} strokeWidth={2} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** The top bar's height below the status bar. */
const BAR_HEIGHT = 52;

/** A row that opens to show more, collapsed at first (UX08). */
function Disclosure({ title, count, last, children }: { title: string; count?: string; last?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={!last && styles.divider}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={count ? `${title}, ${count}` : title}
        style={({ pressed }) => [styles.disclosure, pressed && styles.backPressed]}
      >
        <AppText variant="bodyStrong" style={styles.itemText}>
          {title}
          {count ? <AppText variant="label"> · {count}</AppText> : null}
        </AppText>
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.inkFaint}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={open ? styles.flipped : undefined}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Path d="M6 9l6 6 6-6" />
        </Svg>
      </Pressable>
      {open ? <View style={styles.disclosed}>{children}</View> : null}
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
  fill: { flex: 1 },
  name: { fontSize: 30, lineHeight: 34 },
  plateLine: { fontSize: 15, lineHeight: 21 },
  respelling: { color: colors.pine },
  strong: { fontFamily: fonts.sansSemibold },
  hear: { alignSelf: 'flex-start', marginTop: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { minHeight: 30, paddingHorizontal: spacing.ms, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, justifyContent: 'center' },
  tagText: { color: colors.pine, fontFamily: fonts.sansSemibold, fontSize: 13, lineHeight: 18 },
  // Frosted and round; it stays put while the plate scrolls.
  back: {
    position: 'absolute',
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  backPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 68,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  barTitle: { fontSize: 17, lineHeight: 22, textAlign: 'center' },
  backPressed: { opacity: 0.7 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.ms },
  pill: { flexGrow: 1, flexBasis: 140, minHeight: 48 },
  care: { paddingHorizontal: 18, gap: 10 },
  section: { gap: 10, marginTop: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.sm },
  number: { minWidth: 20, color: colors.inkSoft },
  itemText: { flex: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.mist },
  disclosure: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingVertical: spacing.ms, paddingHorizontal: spacing.md },
  disclosed: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  flipped: { transform: [{ rotate: '180deg' }] },
});
