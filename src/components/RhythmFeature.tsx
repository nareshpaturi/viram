import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { describePace, describePlan, describeRhythm, describeSlowing, describeTarget, speakRhythm } from '../breathing/describe';
import { planFor, type RhythmStep, type Slowing, type Target } from '../breathing/rhythm';
import { useWash } from '../light/light';
import { useSvgId } from '../light/Wash';
import { HALO } from '../light/washes';
import { fonts, spacing } from '../theme';
import { AppText } from './AppText';
import { RhythmOrb } from './RhythmOrb';
import { RhythmStrip } from './RhythmStrip';

interface Props {
  name: string;
  subtitle?: string | null;
  steps: readonly RhythmStep[];
  target: Target;
  slowing?: Slowing | null;
  /** Accessible hint for Sanskrit names: the pronunciation respelling. */
  nameHint?: string;
}

/**
 * Breathe's ready practice in Soft Light: the rhythm orb in a soft halo,
 * then the name, target, rhythm, planned rounds and duration, and guided
 * pace. At large text sizes the orb shrinks so the words keep their room.
 */
export function RhythmFeature({ name, subtitle, steps, target, slowing = null, nameHint }: Props) {
  const { fontScale } = useWindowDimensions();
  const wash = useWash() ?? 'day';
  const haloId = useSvgId('halo');
  const orb = fontScale > 1.3 ? 120 : 184;
  const halo = Math.round((orb * 300) / 184);
  const plan = planFor(steps, target, slowing);
  const rhythm = describeRhythm(steps);
  const seconds = /^\d/.test(rhythm) ? `${rhythm} sec` : rhythm;
  return (
    <View style={styles.wrap}>
      <View style={[styles.stage, { height: orb }]}>
        <View style={[styles.halo, { width: halo, height: halo, marginLeft: -halo / 2, marginTop: -halo / 2 }]} pointerEvents="none">
          <Svg width={halo} height={halo}>
            <Defs>
              <RadialGradient id={haloId} cx="0.5" cy="0.5" r="0.5">
                {HALO[wash].map((s, i) => (
                  <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                ))}
              </RadialGradient>
            </Defs>
            <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#${haloId})`} />
          </Svg>
        </View>
        <RhythmOrb steps={steps} size={orb} />
      </View>
      <AppText variant="heading" style={styles.name} accessibilityRole="header" accessibilityHint={nameHint}>
        {name}
      </AppText>
      <AppText variant="label" style={styles.center}>
        {[subtitle, describeTarget(target)].filter(Boolean).join(' · ')}
      </AppText>
      <View style={styles.strip}>
        <RhythmStrip steps={steps} />
      </View>
      {slowing ? (
        <AppText variant="label" style={styles.center}>
          {describeSlowing(steps, slowing)}, a little each round.
        </AppText>
      ) : null}
      <AppText
        variant="label"
        style={styles.center}
        accessibilityLabel={`${speakRhythm(steps)}. ${describePlan(steps, target, slowing)} practice, guided ${describePace(plan)} breaths a minute.`}
      >
        {seconds} · {describePlan(steps, target, slowing)} · guided {describePace(plan)} breaths/min
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  stage: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  halo: { position: 'absolute', left: '50%', top: '50%' },
  name: { fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 30, textAlign: 'center' },
  center: { textAlign: 'center' },
  strip: { width: 168, marginVertical: 6 },
});
