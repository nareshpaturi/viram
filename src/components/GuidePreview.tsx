import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { stepLabel } from '../breathing/describe';
import type { RhythmStep } from '../breathing/rhythm';
import { useSvgId } from '../light/Wash';
import type { PreviewFrame } from '../practice/guidePreview';
import { drawsAboveCircle, drawsIllustration, type VisualGuide } from '../practice/visualGuide';
import { colors, fonts, phaseColors } from '../theme';
import { AppText } from './AppText';
import { BreathingGuide } from './BreathingGuide';
import { NoseDrawing } from './NoseDrawing';

const THUMB = 84;
const STILL_STEP: RhythmStep = { kind: 'inhale', seconds: 4, side: 'left' };

/** The chooser card's 84 pt picture of each style, on a pine tile. Decorative. */
export function GuideThumbnail({ guide }: { guide: VisualGuide }) {
  if (guide === 'illustrated') {
    return (
      <View style={styles.tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <NoseDrawing step={STILL_STEP} look="thumb" size={THUMB} progress={1} reducedMotion />
      </View>
    );
  }
  // A mini breath circle: the lit sky disc with a count, the ring, and the session arc's coral point. No nose.
  return (
    <View style={styles.tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={THUMB} height={THUMB} viewBox="0 0 84 84">
        <Circle cx={42} cy={42} r={33} fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth={1} />
        <Path d="M42 9A33 33 0 0 1 72.3 55" fill="none" stroke="rgba(255, 255, 255, 0.75)" strokeWidth={1.6} strokeLinecap="round" />
        <Circle cx={72.3} cy={55} r={2.6} fill={colors.coral} />
        <Circle cx={42} cy={42} r={23} fill={phaseColors.inhale} />
        <Circle cx={37} cy={36} r={13} fill="#FFFFFF" fillOpacity={0.35} />
        <SvgText x={42} y={49} textAnchor="middle" fontFamily={fonts.sansMedium} fontSize={20} fill={colors.pine}>
          3
        </SvgText>
      </Svg>
    </View>
  );
}

interface StageProps {
  guide: VisualGuide;
  /** The current practice's steps: the illustrated guide keeps the circle for mouth breathing and Om. */
  steps: readonly RhythmStep[];
  frame: PreviewFrame;
  reducedMotion: boolean;
}

/** A 176 pt pine stage playing one cycle in a style, on the preview's own clock. Decorative and silent. */
export function GuideStage({ guide, steps, frame, reducedMotion }: StageProps) {
  const id = useSvgId('stage');
  const { step } = frame;
  const secondsLeft = Math.max(1, Math.ceil((frame.durationMs - frame.elapsedMs) / 1000));
  const progress = frame.durationMs > 0 ? frame.elapsedMs / frame.durationMs : 1;
  const illustrated = drawsIllustration(guide, steps);
  const above = !illustrated && drawsAboveCircle(step);
  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#17423A" />
            <Stop offset="0.5" stopColor={colors.practiceBackground} />
            <Stop offset="1" stopColor="#0C211C" />
          </LinearGradient>
          <RadialGradient id={`${id}glow`} cx="0.5" cy="0.46" r="0.6">
            <Stop offset="0" stopColor={phaseColors[step.kind]} stopOpacity={0.3} />
            <Stop offset="1" stopColor={phaseColors[step.kind]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}bg)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}glow)`} />
      </Svg>
      {illustrated ? (
        // Lifted so the air's tail ends above the step's name.
        <View style={styles.lifted}>
          <NoseDrawing step={step} look="preview" size={144} progress={progress} reducedMotion={reducedMotion} />
        </View>
      ) : (
        <View style={styles.circleRow}>
          {above ? <NoseDrawing step={step} look="compact" size={64} progress={progress} reducedMotion={reducedMotion} /> : null}
          <BreathingGuide
            kind={step.kind}
            hum={!above && (step.cue === 'hum' || step.cue === 'om')}
            stepKey={`preview|${frame.index}`}
            durationMs={frame.durationMs}
            elapsedMs={frame.elapsedMs}
            count={secondsLeft}
            frozen={false}
            reducedMotion={reducedMotion}
            size={124}
            progress={frame.cycleElapsedMs / frame.cycleMs}
            numeral={32}
          />
        </View>
      )}
      <AppText variant="heading" style={styles.stageLabel}>{illustrated ? `${stepLabel(step)} · ${secondsLeft}` : stepLabel(step)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: THUMB, height: THUMB, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.practiceBackground },
  stage: { height: 176, marginHorizontal: 12, marginTop: 12, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start' },
  lifted: { marginTop: -10 },
  circleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6 },
  stageLabel: { position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center', fontSize: 18, lineHeight: 22, color: colors.practiceText },
});
