import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '../src/accessibility/motion';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { GuideStage, GuideThumbnail } from '../src/components/GuidePreview';
import { Screen } from '../src/components/Screen';
import { LightProvider, useEverydayWash, useGlass, useWash } from '../src/light/light';
import { Wash } from '../src/light/Wash';
import { WASHES } from '../src/light/washes';
import {
  cycleMs,
  parsePreviewPractice,
  previewFrame,
  previewLength,
  previewProgress,
  previewReducer,
  type PreviewFrame,
  type PreviewPractice,
} from '../src/practice/guidePreview';
import { readyPractice } from '../src/practice/ready';
import {
  keepsCircleNote,
  VISUAL_GUIDE_DESCRIPTION,
  VISUAL_GUIDE_NAME,
  VISUAL_GUIDE_USE,
  VISUAL_GUIDES,
  visualGuideOf,
  type VisualGuide,
} from '../src/practice/visualGuide';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, spacing, touchTarget } from '../src/theme';

/** Where the chooser was opened from, named on its back button. */
const ORIGIN_LABEL: Record<string, string> = { guidance: 'Guidance', pause: 'Pause', settings: 'Cues & sound' };
const PREVIEW_TICK_MS = 50;

export default function VisualGuideRoute() {
  // The everyday Soft Light, even over a paused practice.
  const wash = useEverydayWash();
  return (
    <LightProvider wash={wash}>
      <StatusBar style="dark" />
      <VisualGuideChooser />
    </LightProvider>
  );
}

/**
 * Visual guide: breath circle or illustrated guide. Choosing a card only
 * changes the draft; Preview plays one silent cycle of the current practice
 * in that style; Use saves and returns to where it was opened (Guidance,
 * Pause, or Cues & sound). Back discards the draft. Nothing here starts,
 * resumes, or changes a practice.
 */
function VisualGuideChooser() {
  const params = useLocalSearchParams<{ origin?: string; practice?: string }>();
  const wash = useWash() ?? 'day';
  const { preferences, update } = usePreferences();
  const reducedMotion = useReducedMotion(preferences.motion);
  const [draft, setDraft] = useState<VisualGuide>(() => visualGuideOf(preferences.visualGuide));
  const [saveFailed, setSaveFailed] = useState(false);
  // The practice to preview: the ready one from Guidance, the paused one from Pause.
  const practice = useMemo(() => {
    const passed = parsePreviewPractice(params.practice);
    if (passed) return passed;
    const ready = readyPractice(preferences, stores());
    return { name: ready.name, steps: ready.steps };
    // The practice is fixed for the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.practice]);
  const total = cycleMs(practice.steps);
  // At large text the cards stack, and the note scrolls with them so Use keeps its room.
  const large = useWindowDimensions().fontScale > 1.3;
  const footnote = (
    <AppText variant="label" style={styles.footnote}>
      Remembered for every practice. You can switch while paused.
    </AppText>
  );

  // One preview at a time, on its own clock; it stops after one cycle.
  const [preview, dispatch] = useReducer(previewReducer, null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!preview) return;
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      dispatch({ type: 'tick', at, cycleMs: total });
    }, PREVIEW_TICK_MS);
    return () => clearInterval(timer);
  }, [preview, total]);
  // Leaving the screen or the app stops it; coming back doesn't restart it.
  useFocusEffect(useCallback(() => () => dispatch({ type: 'stop' }), []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') dispatch({ type: 'stop' });
    });
    return () => subscription.remove();
  }, []);
  const frame = preview ? previewFrame(practice.steps, Math.max(0, now - preview.startedAt)) : null;

  const togglePreview = (guide: VisualGuide) => {
    const at = Date.now();
    setNow(at);
    dispatch({ type: 'toggle', guide, at });
  };

  const use = () => {
    dispatch({ type: 'stop' });
    try {
      update({ visualGuide: draft });
    } catch {
      // The saved choice stays as it was; Use tries again.
      setSaveFailed(true);
      AccessibilityInfo.announceForAccessibility('Couldn’t save your visual guide. Try again.');
      return;
    }
    router.back();
  };

  const origin = ORIGIN_LABEL[params.origin ?? ''] ?? 'Back';
  return (
    <Screen
      background={<Wash wash={WASHES[wash]} />}
      footer={
        <>
          {large ? null : footnote}
          {saveFailed ? (
            <AppText variant="label" style={styles.error} accessibilityLiveRegion="polite">
              Couldn’t save your choice. Try again.
            </AppText>
          ) : null}
          <Button title={VISUAL_GUIDE_USE[draft]} onPress={use} />
        </>
      }
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={`Back to ${origin}, without changing your visual guide`}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.pine} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 6l-6 6 6 6" />
        </Svg>
        <AppText variant="control" style={styles.backText}>
          {origin}
        </AppText>
      </Pressable>
      <View style={styles.heading}>
        <AppText variant="title" accessibilityRole="header">
          Visual guide
        </AppText>
        <AppText style={styles.lead}>Choose what helps you follow your breath.</AppText>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Visual guide" style={styles.cards}>
        {VISUAL_GUIDES.map((guide) => (
          <GuideCard
            key={guide}
            guide={guide}
            selected={draft === guide}
            onSelect={() => setDraft(guide)}
            frame={preview?.guide === guide ? frame : null}
            onPreview={() => togglePreview(guide)}
            practice={practice}
            reducedMotion={reducedMotion}
            stacked={large}
          />
        ))}
      </View>
      {large ? footnote : null}
    </Screen>
  );
}

interface CardProps {
  guide: VisualGuide;
  selected: boolean;
  onSelect: () => void;
  /** Where this card's preview is, while it plays. */
  frame: PreviewFrame | null;
  onPreview: () => void;
  practice: PreviewPractice;
  reducedMotion: boolean;
  /** Large text: the picture and indicator above the words, which take the full width. */
  stacked: boolean;
}

/**
 * One style: the picture, name, and description are one radio choice; the
 * Preview button beside them is its own control, never nested.
 */
function GuideCard({ guide, selected, onSelect, frame, onPreview, practice, reducedMotion, stacked }: CardProps) {
  const glass = useGlass();
  const name = VISUAL_GUIDE_NAME[guide];
  const note = guide === 'illustrated' ? keepsCircleNote(practice.name, practice.steps) : null;
  const playing = frame !== null;
  const seconds = Math.round(cycleMs(practice.steps) / 1000);
  const ring = <View style={[styles.ring, { borderColor: selected ? colors.pine : colors.inkFaint }]}>{selected ? <View style={styles.dot} /> : null}</View>;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: glass.solid ? colors.surface : 'rgba(255, 255, 255, 0.78)' },
        { borderColor: selected ? colors.pine : 'rgba(255, 255, 255, 0.95)' },
      ]}
    >
      {frame ? <GuideStage guide={guide} steps={practice.steps} frame={frame} reducedMotion={reducedMotion} /> : null}
      <Pressable
        onPress={onSelect}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, selected }}
        accessibilityLabel={[`${name}. ${VISUAL_GUIDE_DESCRIPTION[guide]}`, note].filter(Boolean).join(' ')}
        style={({ pressed }) => [styles.choice, stacked && styles.stacked, pressed && styles.pressed]}
      >
        {stacked ? (
          <View style={styles.stackedTop}>
            <GuideThumbnail guide={guide} />
            {ring}
          </View>
        ) : (
          <GuideThumbnail guide={guide} />
        )}
        <View style={[styles.words, stacked && styles.stackedWords]}>
          <AppText variant="bodyStrong" style={styles.name}>
            {name}
          </AppText>
          <AppText variant="label">{VISUAL_GUIDE_DESCRIPTION[guide]}</AppText>
          {note ? (
            <AppText variant="label" style={styles.note}>
              {note}
            </AppText>
          ) : null}
        </View>
        {stacked ? null : ring}
      </Pressable>
      <View style={[styles.footer, stacked && styles.stackedFooter]}>
        <Pressable
          onPress={onPreview}
          accessibilityRole="button"
          accessibilityLabel={playing ? `Stop preview of the ${name.toLowerCase()}` : `Preview the ${name.toLowerCase()}, ${seconds} seconds, no sound`}
          style={({ pressed }) => [styles.preview, pressed && styles.pressed]}
        >
          <Svg width={14} height={14} viewBox="0 0 14 14">
            {playing ? (
              <Rect x={2} y={2} width={10} height={10} rx={2} fill={colors.pine} />
            ) : (
              <Path d="M4 2.5v9l7.5-4.5z" fill="none" stroke={colors.pine} strokeWidth={1.6} strokeLinejoin="round" />
            )}
          </Svg>
          <AppText variant="control" style={styles.previewText}>
            {playing ? 'Stop preview' : 'Preview'}
          </AppText>
        </Pressable>
        <AppText variant="label" style={styles.meta} importantForAccessibility="no" accessibilityElementsHidden>
          {frame ? previewProgress(frame) : previewLength(practice.steps)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -spacing.sm, paddingHorizontal: spacing.sm, marginTop: -spacing.ms },
  backText: { color: colors.pine },
  heading: { gap: spacing.sm },
  lead: { color: colors.inkSoft, lineHeight: 23 },
  cards: { gap: 14 },
  card: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden', boxShadow: '0px 8px 24px rgba(18, 55, 47, 0.07)' },
  choice: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: spacing.md },
  words: { flex: 1, gap: 2 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  stackedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stackedWords: { flex: 0 },
  name: { fontSize: 17, lineHeight: 23 },
  note: { color: colors.pine },
  ring: { alignSelf: 'flex-start', width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pine },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.sm, paddingLeft: spacing.sm, paddingRight: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(18, 55, 47, 0.08)' },
  preview: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  previewText: { color: colors.pine, fontSize: 15 },
  // Lines up under the Preview icon when it wraps at large text.
  meta: { fontVariant: ['tabular-nums'], paddingLeft: spacing.sm },
  stackedFooter: { paddingBottom: spacing.ms },
  footnote: { textAlign: 'center', color: colors.inkSoft },
  error: { textAlign: 'center', color: colors.danger },
  pressed: { opacity: 0.8 },
});
