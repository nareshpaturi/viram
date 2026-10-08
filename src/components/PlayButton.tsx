import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/** A sample's play button (UX10): play on mist; while playing, a white stop square on pine. */
export function PlayButton({ playing, label, onPress }: { playing: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? `Stop sample of ${label}` : `Play a sample of ${label}`}
      hitSlop={2}
      style={({ pressed }) => [styles.button, { backgroundColor: playing ? colors.pine : colors.mist }, pressed && styles.pressed]}
    >
      <Svg width={14} height={14} viewBox="0 0 14 14">
        {playing ? <Rect x={2} y={2} width={10} height={10} rx={2} fill={colors.white} /> : <Path d="M4 2.5v9l7.5-4.5z" fill={colors.pine} />}
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
