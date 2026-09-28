import { StyleSheet, Switch, View } from 'react-native';
import { colors, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function SwitchRow({ label, description, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="label">{description}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityHint={description}
        trackColor={{ true: colors.primary, false: colors.line }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.line}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1, gap: 2 },
});
